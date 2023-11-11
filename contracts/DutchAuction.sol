// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";
import "./ErrorDutchAuction.sol";

// TODO
// 5. REFACTOR to Safe Math & uint gas optimizer

// For presentation purpose
// 1. Mentioned that the discount rate is calculated based on duration ... (Bs on this)
// 2. Mentioned how we handle with the updates.address

/**
 * @title Dutch Auction Contract
 * @author Lee Zong Yu, Nathan Axel, Koh Jun Kai
 * @notice
 * @dev There is an important concept in the implementation of the contract.
 *
 * Since there is no such cron job / time triggered function, therefore there is easily to have an inconsistent state in blockchain.
 * However, just to query an internal state of contract and update the state would be costly.
 * 
 * To ensure consistency, We should abstract two things
 * 1. external view function - When user called an external view function, the blockchain should "seems" like it is correct.
 * 2. external state-changing function - When user called this function, the contract should update the internal state to the correct state and make sure it is updated.
 *
 * By doing so, we can ensure the consistency of the state and at the same time allow querying without consuming gas.
 *
 * @custom:securityreentry This function enforced security by ensuring update amount before transfer eth to other account
 * @custom:privacy This function enforced privacy such that only the sender this function can query its own state in this contract
 * @custom:view This function is costly and it is mainly to ensure the view function are consistent. Please do not call it for any state-changing function
 */

contract DutchAuction {
    enum Stages {
        AuctionConstructed,
        AuctionStarted,
        AuctionEnded
    }

    event auctionEndEvent();

    ERC20Burnable private immutable token;

    address private immutable owner;
    uint256 private immutable startingPrice;
    uint256 private immutable reservePrice;
    uint256 private immutable discountRate;
    uint256 private immutable duration;
    uint256 private constant DECIMAL_PLACE = 10 ** 10;

    Stages private stage = Stages.AuctionConstructed;   // 1 byte
    bool private hasOwnerWithdraw;                      // 1 byte  
    address private lastBidOwner;                       // 20 byte
    uint256 private totalTokenSold;                     // 32 byte  
    uint256 private lastBidRefund;                      // 32 byte
    uint256 private clearingPrice;                      // 32 byte
    uint256 private startAt;                            // 32 byte
    uint256 private expiresAt;                          // 32 byte
    uint256 private tokenAmount;                        // 32 byte
    uint256 private tokenLeft;                          // 32 byte

    address[] private buyers; 
    mapping(address => uint256) private buyersPosition; // address, value ETH to commit

    /**
     * @dev a modifier function ensure the function can only be called during certain stage
     * @param stage_ The query stage
     */
    modifier atStage(Stages stage_) {
        if (stage != stage_) revert FunctionInvalidAtThisStage();
        _;
    }
    /**
     * @dev To check whether the auction have started.
     */
    modifier auctionStart() {
        if (stage == Stages.AuctionConstructed)
            revert FunctionInvalidAtThisStage();
        _;
    }

    /**
     * @dev Perform timed transitions after auction ended */
    modifier timedTransitions() {
        _updateTokenLeft();
        if (
            stage == Stages.AuctionStarted &&
            (block.timestamp >= expiresAt || tokenLeft == 0)
        ) _nextStage();
        _;
    }
    /**
     * @dev only owner can called function
     */
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwnerCanCallFunction();
        _;
    }

    /**
     * @dev Two functionality.
     * 1. Move the stage of auction to next stage
     * 2. If auction ended, no matter is token sold out or time out, the clearing price is fix here.
     */
    function _nextStage() private {
        if (stage == Stages.AuctionStarted) {
            // Reveal Clearing Price
            _updateTokenLeft();
            clearingPrice = _calculateCorrectPrice();
      
            totalTokenSold = tokenAmount - tokenLeft;

            // burn unused token
            token.burn(tokenLeft);
        
            delete buyers;

            emit auctionEndEvent();
        }
        stage = Stages(uint(stage) + 1);
    }

    /**
     *
     * @param _startingPrice The starting Price of a token
     * @param _reservePrice  The reserve Price of a token (Note that this should be positive and less than starting Price)
     * @param _token   The address of token
     * @param _duration  The duration of the auction
     */
    constructor(
        uint256 _startingPrice,
        uint256 _reservePrice,
        address _token,
        uint256 _duration
    ) {
        if (
            _startingPrice < _reservePrice ||
            _reservePrice == 0 ||
            _duration == 0 ||
            ERC20Burnable(_token).totalSupply() == 0
        ) revert InvalidAuctionInput();

        owner = msg.sender;
        token = ERC20Burnable(_token);
        duration = _duration;
        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        discountRate =
            (startingPrice * DECIMAL_PLACE - reservePrice * DECIMAL_PLACE) /
            duration;
    }

    /// @notice This function allowed owner to start an auction. Owner are expected to approve the amount of token transfer beforehand
    /// @dev This function check whether the token Amount approved/allow to transfer is more than zero as well to ensure non-zero token Amount
    function startAuction()
        external
        onlyOwner
        atStage(Stages.AuctionConstructed)
    {
        tokenAmount = token.allowance(owner, address(this));

        if (tokenAmount == 0) revert InvalidAuctionInput();

        tokenLeft = tokenAmount;
        token.transferFrom(owner, address(this), tokenAmount); // This is to lock the token so owner cannot transfer during auction
        startAt = block.timestamp;
        expiresAt = block.timestamp + duration;
        _nextStage();
    }

    /**
     * @dev To be called externally and during revealing price stage only.
     *
     * Consider when a user would like to get the current price but a state-changing function haven,t been called.
     * From User point of view need to see the correct price / clearing price ever though blockchain itself might have a wrong stage.
     * The inconsistent blockchain would be eventually updated when any state-changing function is called.
     *
     * Binary Search Algorithm is using to get the upper bound of the correct price;
     * */
    function _calculateCorrectPrice() private view returns (uint256) {
        
        uint256 currentPrice = _curPrice();

        if (_calculateTokenSold(currentPrice) >= tokenAmount) {
            // binary search
            uint256 low = currentPrice + 1;
            uint256 high = (address(this).balance - lastBidRefund) /
                tokenAmount +
                1;
            uint256 mid;

            while (low < high) {
                mid = (low + high) / 2;
                if (_calculateTokenSold(mid) < tokenAmount) high = mid;
                else low = mid + 1;
            }
            currentPrice = low - 1;
        }
        return currentPrice;
    }

    /**
     * @dev To be called only during auction started by any other function
     *
     * The reason for two getPrice function is to reduce the amount of gasUsed.
     * When any state-changing function would like to get the current price during auction start / bidding stage,
     * if the tokenLeft check have passed, the price is definitely consistent with the linear function.
     * Therefore, there is no reason to called binary search.
     * */
    function _curPrice()
        private
        view
        returns (uint256)
    // atStage(Stages.AuctionStarted)
    {
        // Doing this to avoid calling getPrice during auctionStart due to long idle and causes math error.
        if(block.timestamp >= expiresAt) {
            return reservePrice;
        }
        return
            (startingPrice *
                DECIMAL_PLACE -
                discountRate *
                (block.timestamp - startAt)) / DECIMAL_PLACE;
    }

    /**
     * @notice Get the current price of the token.
     * @dev This is function only allowed external called and should always return correct value when user call it even though the internal state might not be consistent yet.
     * @custom:view 
     */
    function getPrice() external view auctionStart returns (uint256) {
        if (stage == Stages.AuctionEnded) {
            return clearingPrice;
        }
        return _calculateCorrectPrice();
    }

    /**
     * @notice Get the amount of the token left.
     * @dev This is function only allowed external called and should always return correct value when user call it even though the internal 'tokenLeft' might not be consistent yet.
     * @custom:view 
     */
    function getTokenLeft() external view auctionStart returns (uint256) {
        if (stage == Stages.AuctionEnded) return tokenLeft;
        return
            tokenAmount -
            Math.min(_calculateTokenSold(_curPrice()), tokenAmount);
    }

    /**
     * @notice Get the amount of a bidder bid so far
     * @custom:privacy
     * @custom:view 
     */
    function getPosition() external view auctionStart returns (uint256) {
        return buyersPosition[msg.sender];
    }

    /**
     * @dev this is used as a helper function for all query tokenSold function.
     *
     * It serves as the helper function for 'calculating the correct Price'
     * It serves as the calculation for all query tokenSold function and pass the _curPrice during bidding stage.
     * @param price given a price and calculate the tokenSold if the clearing price is such price
     */
    function _calculateTokenSold(
        uint256 price
    ) private view returns (uint256) {
        uint256 tokenSold = 0;
        for (uint256 i = 0; i < buyers.length; i++)
            tokenSold += uint(buyersPosition[buyers[i]] / price);
        return tokenSold;
    }

    /**
     * @dev Make sure to call it during auction start only. Checking whether auction have started is a wasteful of gas.
     */
    function _updateTokenLeft() private {
        if (tokenLeft == 0) return; // small optimization .. no need to update again if token left is already zero
        tokenLeft =
            tokenAmount -
            Math.min(_calculateTokenSold(_curPrice()), tokenAmount);
    }

    /**
     * @notice User place the amount of value send to this contract as the amount of bid placed.
     *
     * @dev
     */
    function placeBid() external payable atStage(Stages.AuctionStarted) {
        // This is to avoid revert the changes of _nextStage();
        if (block.timestamp >= expiresAt) {
            lastBidRefund = msg.value;
            _nextStage();
            lastBidOwner = msg.sender;
            return;
        }

        uint256 currentPrice = _curPrice();
        if (msg.value < currentPrice) revert InvalidBidValue();

        _updateTokenLeft();
        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0 && tokenLeft > 0) buyers.push(buyer); //new buyer
        uint256 bid = Math.min(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
  
        // There is a refund needed
        if (msg.value > bid) {
            lastBidRefund = msg.value - bid;
            tokenLeft = 0; // Small optimization to avoid the recomputation of for loop in _updateTokenLeft() in _nextStage()
            _nextStage();
            lastBidOwner = msg.sender;
        }
    }

    /**
     * @notice This is for bid winner to withdraw tokens and refund.
     *
     * @dev To be called only after auction ended
     * @custom:securityreentry
     */
    function withdrawTokens()
        external
        timedTransitions
        atStage(Stages.AuctionEnded)
    {

        uint256 bid = buyersPosition[msg.sender];
        if (bid == 0 && (msg.sender != lastBidOwner || lastBidRefund == 0)) revert InvalidWithdrawer();

        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //clear records and transfer token to buyer
        buyersPosition[msg.sender] = 0;
        token.transfer(msg.sender, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (msg.sender == lastBidOwner) {
            refund += lastBidRefund;
            lastBidRefund = 0;
        }

        if (refund > 0) payable(msg.sender).transfer(refund);
    }

    /**
     * @notice This is for owner to withdraw funds from auction
     * 
     * @dev This function returns instead of revert is so that even if no one place Bid. Owner can called this function to endAuction and burn the tokens.
     * @custom:securityreentry
     */
    function withdrawOwnerFunds()
        external
        onlyOwner
        timedTransitions
        atStage(Stages.AuctionEnded)
    {
        if (hasOwnerWithdraw) return; 
        uint withdrawAmount = totalTokenSold * clearingPrice; // (Security) reentry attack
        hasOwnerWithdraw = true;
        payable(msg.sender).transfer(withdrawAmount);
    }

    /**
     * @dev This function act as atStage(Stages.AuctionEnded) modified for all the view function. As this might be expensive, please make sure you call it only for view function.
     * As when user called the view function during auction ended, internal state of stages may have not changed yet and this function act as an expensive (if not called by view) but yet strict for consistent from user point of view
     * @custom:view 
     */
    function _getClearingPrice() private view returns (uint256) {
        if (stage == Stages.AuctionEnded) return clearingPrice;
        else if (
            stage == Stages.AuctionStarted &&
            (block.timestamp >= expiresAt ||
                tokenAmount - Math.min(_calculateTokenSold(_curPrice()), tokenAmount) == 0)
        ) {
            return _calculateCorrectPrice();
        } else revert FunctionInvalidAtThisStage();
    }

    /**
     * @notice For user to know what is the amoount of refund get
     * @custom:privacy
     * @custom:view 
     */
    function getRefund()
        external
        view
        // atStage(Stages.AuctionEnded)
        returns (
            uint256
        )
    {
        uint256 _clearingPrice = _getClearingPrice();
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / _clearingPrice;
        uint256 amountPaid = tokenBought * _clearingPrice;
        uint256 refund = bid - amountPaid;
        if (msg.sender == lastBidOwner) refund += lastBidRefund;
        return refund;
    }

    /**
     * @notice For user to query the amount of tokens win
     * @custom:privacy
     * @custom:view 
     */
    function getTokens()
        external
        view
        returns (
            // atStage(Stages.AuctionEnded)
            uint256
        )
    {
        uint256 _clearingPrice = _getClearingPrice();
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / _clearingPrice;
        return tokenBought;
    }

    /**
     * @notice For owner to know how much money he earned
     * @custom:privacy
     * @custom:view 
     */
    function getOwnerRevenue()
        external
        view
        onlyOwner //atStage(Stages.AuctionEnded)
        returns (uint256)
    {
        if (hasOwnerWithdraw) return 0;
        if (stage == Stages.AuctionEnded) return totalTokenSold * clearingPrice;

        uint256 _clearingPrice = _getClearingPrice();
        uint256 _ownerFunds = _clearingPrice *
            _calculateTokenSold(_clearingPrice);
        return _ownerFunds;
    }

    /**
     * @notice To query the current stage of the contract
     * @custom:view 
     */
    function getStage() external view returns (string memory) {
        if (
            stage == Stages.AuctionEnded ||
            (stage == Stages.AuctionStarted &&
                (block.timestamp >= expiresAt ||
                    tokenAmount -
                        Math.min(
                            _calculateTokenSold(_curPrice()),
                            tokenAmount
                        ) ==
                    0))
        ) return "Ended";
        if (stage == Stages.AuctionStarted) return "Started";
        return "Not Yet Started";
    }

    /**
     * @notice To query the expiresAt of the contract
     * @custom:view 
     */
    function getExpiresAt() external view returns (uint256) {
        return expiresAt;
    }
}


/*

Experiment on gas cost
1. replace expiresAt with its calculation instead of SSTORE but not better.
    - Lower Methods cost but higher deployment cost. The deployment cost is much more cheaper than in method.

*/