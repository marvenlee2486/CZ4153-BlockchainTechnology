export const datastore = {
    get: (key: string): any => {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    },
    set: (key: string, value: any): void => {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(key+":", localStorage.getItem(key));
    },
    remove: (key: string): void => {
      localStorage.removeItem(key);
    },
  };
  