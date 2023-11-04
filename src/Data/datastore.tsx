// "tokens": Map of user IDs ('uid') to minted blockchain token addresses.
// "tokenBalance": Map of minted token address to token balance.
// "auctions": Map of auctionAddress to {ownerUid, startingPrice, reservePrice, list of {bidderUid, bidAmount}]}
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
  getTokenBalance: (address: string): number => {
    const balances = datastore.get("tokenBalance");
    if (!balances) return 0;
    if (balances[address]) return balances[address];
    return 0;
  },
  getTokenAddress: (uid: number): string | null => {
    const tokens = datastore.get("tokens");
    if (!tokens) return null;
    if (tokens[uid]) return tokens[uid];
    return null;
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
  setTokenBalance: (address: string, balance: number): void => {
    const balances = datastore.get("tokenBalance");
    if (!balances) {
      datastore.set("tokenBalance", { [address]: balance });
    } else {
      datastore.set("tokenBalance", { ...balances, [address]: balance });
    }
  },
  updateTokens: (uid: number, token: string): void => {
    const tokens = datastore.get("tokens");
    if (!tokens) {
      datastore.set("tokens", { [uid]: token });
    } else {
      datastore.set("tokens", { ...tokens, [uid]: token });
    }
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  clear: (): void => {
    localStorage.clear();
  },
  appendAuction: (
    auctionAddress: string,
    ownerUid: number,
    startingPrice: number,
    reservePrice: number,
    timestamp: number, // ms since epoch
    duration: number // in seconds
  ): void => {
    const auctions = datastore.get("auctions") || {};
    auctions[auctionAddress] = {
      ownerUid,
      startingPrice,
      reservePrice,
      bids: [],
      status: "started",
      timestamp: timestamp,
      endTime: timestamp + duration * 1000,
    };
    datastore.set("auctions", auctions);
  },

  appendBid: (auctionAddress: string, Uid: number, bidAmount: number): void => {
    const auctions = datastore.get("auctions");
    if (!auctions) return;
    const auction = auctions[auctionAddress];
    if (!auction) return;
    auction.bids.push({ Uid, bidAmount });
    datastore.set("auctions", auctions);
  },
};
