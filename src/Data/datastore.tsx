/**
 * The datastore object is used to interact with the browser's local storage.
 * It simulates a basic database functionality, primarily for storing and managing data related to user accounts and auctions.
 */

export const datastore = {
  get: (key: string): any => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  getAllData: (): any => {
    const keys = Object.keys(localStorage);
    const values = keys.map((key) => ({ [key]: datastore.get(key) }));
    return values;
  },
  /**
   * @returns AXEL token address of uid
   */
  getMyTokenAddress: (uid: number): string | null => {
    const wallets = datastore.get("tokenWallets");
    if (!wallets) return null;
    if (!wallets[uid]) return null;
    return wallets[uid];
  },
  getAuction: (auctionAddress: string): any => {
    const auctions = datastore.get("auctions");
    if (!auctions) return null;
    if (auctions[auctionAddress]) return auctions[auctionAddress];
    return null;
  },
  set: (key: string, value: any): void => {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(key + ":", localStorage.getItem(key));
  },
  /**
   * Sets the AXEL token address of all users to the latest token address. This occurs when the auction owner withdraws Token
   * or when Seller mints a new Token. This is because if we are only considering AXEL token, then all users should have the same address
   * to the token contract.
   */
  setTokenWallets(tokenAddress: string): void {
    console.log("tokenAddress:", tokenAddress);
    const users = datastore.get("users");
    users.forEach((uid: number) => {
      datastore.updateMyTokenWallet(uid, tokenAddress);
    });
  },
  /**
   * The token address of the user is updated to the most recent token, when the user withdraws their token from the auction.
   */
  updateMyTokenWallet: (uid: number, tokenAddress: string): void => {
    const wallets = datastore.get("tokenWallets") || {};
    datastore.set("tokenWallets", { ...wallets, [uid]: tokenAddress });
  },
  /**
   * The database auction timestamp was previously set to the current time. This updates to the blockchain timestamp.
   */
  updateAuctionTimestamp: (auctionAddress: string, timestamp: number): void => {
    const auctions = datastore.get("auctions");
    if (!auctions) return;
    const auction = auctions[auctionAddress];
    if (!auction) return;
    auction.timestamp = timestamp;
    datastore.set("auctions", auctions);
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  removeAuction: (auctionAddress: string): void => {
    const auctions = datastore.get("auctions");
    if (!auctions) return;
    delete auctions[auctionAddress];
    datastore.set("auctions", auctions);
  },
  clear: (): void => {
    localStorage.clear();
  },
  appendAuction: (
    auctionAddress: string,
    ownerUid: number,
    startingPrice: number,
    reservePrice: number,
    timestamp: number, // auction start time in ms
    duration: number, // in seconds
    tokenOffering: number, // number of tokens offered
    tokenAddress: string // address of token offered in this auction
  ): void => {
    const auctions = datastore.get("auctions") || {};
    auctions[auctionAddress] = {
      ownerUid,
      startingPrice,
      reservePrice,
      timestamp: timestamp,
      expiresAt: timestamp + duration * 1000,
      tokenOffering,
      tokenAddress,
    };
    datastore.set("auctions", auctions);
  },
};
