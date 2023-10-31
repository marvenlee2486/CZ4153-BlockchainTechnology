// LoginPage.tsx
import { useContext, useState } from "react";
import UserContext from "../helpers/UserContext"; // Adjust the import path if necessary
import { User } from "../helpers/UserContext";
import { useNavigate } from "react-router-dom";
import { datastore } from "../Data/datastore";
import { hooks, metaMask } from "../helpers/connector";
import { Status } from "../components/Status";
import { Chain } from "../components/Chain";
import { Accounts } from "../components/Accounts";
import { isAccountActive } from "../helpers/connector";

const {
  useChainId,
  useAccounts,
  useIsActivating,
  useIsActive,
  useProvider,
  useENSNames,
} = hooks;

const LoginPage = () => {
  const chainId = useChainId();
  const accounts = useAccounts();
  const isActivating = useIsActivating();
  const isActive = useIsActive();
  const provider = useProvider();
  const ENSNames = useENSNames(provider);
  const [error, setError] = useState<Error | undefined>();

  console.log(provider);

  const navigate = useNavigate();
  const { login } = useContext(UserContext) ?? {}; // login status

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

  const handleLogin = (user: User) => {
    login?.(user);
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-gray-200">
      <div className="w-[70%] xl flex flex-col items-center justify-center h-[50%] gap-1 p-5 bg-white rounded-sm">
        <div className="flex justify-around">
          <div className="flex flex-col items-center justify-center w-full h-full gap-1 p-5 rounded-sm">
            <Status
              isActivating={isActivating}
              isActive={isActive}
              error={error}
            />
            <div className="w-auto h-10 text-black">
              <Chain chainId={chainId} />
            </div>

            {isActivating ? (
              <div>Activating...</div>
            ) : isActive ? (
              <button
                className="px-3 py-1 text-white bg-red-500 rounded-md"
                onClick={() => {
                  if (metaMask?.deactivate) {
                    void metaMask.deactivate();
                  } else {
                    void metaMask.resetState();
                  }
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                className="px-3 py-1 text-white bg-green-500 rounded-md"
                onClick={() => {
                  void metaMask.activate();
                }}
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
          const buttonActive = isAccountActive(user.address, accounts);
          return (
            <button
              className={`${
                !buttonActive && "opacity-50 cursor-not-allowed"
              } w-20 text-white bg-blue-600 rounded-md`}
              key={user.uid}
              disabled={!buttonActive}
              onClick={() => {
                handleLogin(user);
                userStore.forEach((user) => datastore.set(user.username, user));
              }}
            >
              {user.username}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LoginPage;
