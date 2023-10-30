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
  set: (key: string, value: any): void => {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(key + ":", localStorage.getItem(key));
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
  clear: (): void => {
    localStorage.clear();
  },
  appendAuction: (key: string, newData: any): void => {
    // Get existing data
    const existingDataStr = localStorage.getItem(key);
    let existingData;
    try {
      existingData = existingDataStr ? JSON.parse(existingDataStr) : null;
    } catch (error) {
      existingData = null;
    }

    // Check if existing data is an array
    let updatedData;
    if (Array.isArray(existingData)) {
      // If it's an array, append new data
      updatedData = [...existingData, newData];
    } else {
      // If it's not an array or key is empty, initialize a new array with new data
      updatedData = [newData];
    }

    // Serialize and store updated data
    localStorage.setItem(key, JSON.stringify(updatedData));
  },
  placeBid: (auctionId: string, bid: [number, string]): boolean => {
    const auctions = datastore.get("Auctions");
    if (!Array.isArray(auctions)) {
      console.log("No auctions found");
      return false;
    }

    const targetIndex = auctions.findIndex(
      (auction: any) => auction.auctionId === auctionId
    );
    if (targetIndex === -1) {
      console.log("No auction found");
      return false;
    }

    auctions[targetIndex].bids.push(bid);
    datastore.set("Auctions", auctions);
    return true;
  },
};
