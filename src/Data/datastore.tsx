// "tokenWallet": Map of user IDs ('uid') to the latest AXL Token Address
// "auctions": Map of auctionAddress to {ownerUid, startingPrice, reservePrice, status, timestamp, endTime}
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
  // get the latest token address
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
  // update to latest token address
  updateMyTokenWallet: (uid: number, tokenAddress: string): void => {
    const wallets = datastore.get("tokenWallets") || {};
    datastore.set("tokenWallets", { ...wallets, [uid]: tokenAddress });
  },
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
    timestamp: number, // ms since epoch
    duration: number, // in seconds
    tokenOffering: number,
    tokenAddress: string
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
