// LoginPage.tsx
import { useEffect, useState } from "react";
import UserContext, { useUserContext } from "../helpers/UserContext";
import { User } from "../helpers/UserContext";
import { useNavigate } from "react-router-dom";
import { datastore } from "../Data/datastore";
import { hooks, metaMask } from "../helpers/connector";
import { Status } from "../components/Status";
import { Chain } from "../components/Chain";
import { Accounts } from "../components/Accounts";
import { isAccountActive } from "../helpers/connector";
import { ToastContainer, toast, Flip } from "react-toastify";

const {
  useChainId,
  useAccounts,
  useIsActivating,
  useIsActive,
  useProvider,
  useENSNames,
} = hooks;

/**
 * This page is the first page that the user sees. It simulates "log in" to the application.
 * While it links the users to the MetaMask wallet, a user log in separate from metamask is required in order to assign roles easily.
 * Predefined users are created so that no ETH transactions are required prior to testing. The user can select a user to log in as.
 * @see src/helpers/UserContext.tsx for login logic
 */

const LoginPage = () => {
  const chainId = useChainId();
  const accounts = useAccounts();
  const isActivating = useIsActivating();
  const isActive = useIsActive();
  const provider = useProvider();
  const ENSNames = useENSNames(provider);
  const [error, setError] = useState<Error | undefined>();
  const { login } = useUserContext();

  const userStore: User[] = [
    {
      uid: 0,
      username: "user1",
      email: "user1@gmail.com",
      role: "user",
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    },
    {
      uid: 1,
      username: "user2",
      email: "user2@gmail.com",
      role: "user",
      address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    },
    {
      uid: 2,
      username: "seller1",
      email: "seller1@gmail.com",
      role: "seller",
      address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    },
  ];
  datastore.set("users", userStore);

  const alert = (message: string) => {
    toast.error(message, {
      position: "top-center",
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
      theme: "light",
      transition: Flip,
    });
  };

  const handleLogin = (user: User) => {
    try {
      if (!isActive || chainId !== 1337) {
        alert(
          "Please connect to http://localhost:8545 with MetaMask with ChainId: 1337!"
        );
        return;
      }
      login?.(user);
      userStore.forEach((user) => datastore.set(user.username, user));
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleConnect = async () => {
    try {
      await metaMask.activate();
    } catch (e) {
      console.error("Error connecting with MetaMask", e);
      setError(e instanceof Error ? e : new Error("An unknown error occurred"));
    }
  };

  const handleDisconnect = async () => {
    try {
      if (metaMask?.deactivate) {
        await metaMask.deactivate();
      } else {
        metaMask.resetState();
      }
    } catch (e) {
      console.error("Error disconnecting MetaMask", e);
      setError(e instanceof Error ? e : new Error("An unknown error occurred"));
    }
  };

  useEffect(() => {
    if (!isActive) {
      metaMask.connectEagerly().catch(setError);
    }
    const users = [];
    for (let i = 0; i < userStore.length; i++) {
      users.push(userStore[i].uid);
    }
    datastore.set("users", users);
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-gray-200">
      <div className="w-[70%] xl flex flex-col items-center justify-center h-[700px] gap-1 p-5 bg-white rounded-sm">
        <div className="flex justify-around">
          <div className="flex flex-col items-center justify-center w-full h-full gap-2 p-5 rounded-sm">
            <Status
              isActivating={isActivating}
              isActive={isActive}
              error={error}
            />
            <div className="w-auto h-10 text-black">
              <Chain chainId={chainId} />
              {chainId !== 1337 && isActive && (
                <p className=" text-red-600">
                  Please connect to http://localhost:8545!
                </p>
              )}
            </div>

            {isActivating ? (
              <div>Activating...</div>
            ) : isActive ? (
              <button
                className="px-3 py-1 text-white bg-red-500 rounded-md"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            ) : (
              <button
                className="px-3 py-1 text-white bg-green-500 rounded-md"
                onClick={handleConnect}
              >
                Connect
              </button>
            )}
          </div>
          <Accounts
            accounts={accounts}
            provider={provider}
            ENSNames={ENSNames}
          />
        </div>
        <h2>Select a User to Login</h2>
        {userStore.map((user) => {
          let buttonActive = false;
          if (!accounts) buttonActive = false;
          else buttonActive = isAccountActive(user.address, accounts[0]);
          return (
            <button
              className={`${
                !buttonActive && "opacity-50 cursor-not-allowed"
              } w-20 text-white bg-blue-600 rounded-md`}
              key={user.uid}
              disabled={!buttonActive}
              onClick={() => {
                handleLogin(user);
              }}
            >
              {user.username}
            </button>
          );
        })}
      </div>
      <ToastContainer />
    </div>
  );
};

export default LoginPage;
