import { Outlet, Link } from "react-router-dom";
import { useUserContext } from "../helpers/UserContext";

const RootLayout = () => {
  const { user, logout } = useUserContext();
  return (
    <>
      <nav className=" fixed top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="lg:px-5 lg:pl-3 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <button
                data-drawer-target="logo-sidebar"
                data-drawer-toggle="logo-sidebar"
                aria-controls="logo-sidebar"
                type="button"
                className="sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 inline-flex items-center p-2 text-sm text-gray-500 rounded-lg"
              >
                <span className="sr-only">Open sidebar</span>
                <svg
                  className="w-6 h-6"
                  aria-hidden="true"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    fillRule="evenodd"
                    d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                  ></path>
                </svg>
              </button>
              <a href="https://flowbite.com" className="md:mr-24 flex ml-2">
                <img
                  src="https://flowbite.com/docs/images/logo.svg"
                  className="h-8 mr-3"
                  alt="FlowBite Logo"
                />
                <span className="sm:text-2xl whitespace-nowrap self-center text-xl font-semibold">
                  Dutch Auction
                </span>
              </a>
            </div>
            <div className="flex items-center">
              <div className="flex items-center ml-3">
                <div className="flex gap-2">
                  <span className="sm:text-2xl whitespace-nowrap self-center text-xl font-semibold">
                    {user?.username}
                  </span>
                  <button
                    type="button"
                    className="focus:ring-4 focus:ring-gray-300 flex text-sm bg-gray-800 rounded-full"
                    aria-expanded="false"
                    data-dropdown-toggle="dropdown-user"
                    id="button-dropdown"
                  >
                    <span className="sr-only">Open user menu</span>
                    <img
                      className="w-8 h-8 rounded-full"
                      src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
                      alt="user photo"
                    />
                  </button>
                </div>
                <div
                  className=" z-50 hidden my-4 text-base list-none bg-white divide-y divide-gray-100 rounded shadow"
                  id="dropdown-user"
                >
                  <div className="px-4 py-3" role="none">
                    <p className=" text-sm text-gray-900" role="none">
                      {user?.username}
                    </p>
                    <p
                      className=" text-sm font-medium text-gray-900 truncate"
                      role="none"
                    >
                      {user?.email}
                    </p>
                  </div>
                  <ul className="py-1" role="none">
                    <li>
                      <div
                        onClick={logout}
                        className="hover:bg-gray-100 block px-4 py-2 text-sm text-gray-700"
                        role="menuitem"
                      >
                        <div>Sign Out</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <aside
        id="logo-sidebar"
        className="sm:translate-x-0 fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200"
        aria-label="Sidebar"
      >
        <div className=" h-full px-3 pb-4 overflow-y-auto bg-white">
          <ul className="space-y-2 font-medium">
            <li>
              <Link
                to={`viewauction/${user?.uid}`}
                className=" hover:bg-gray-100 group flex items-center p-2 text-gray-900 rounded-lg"
              >
                <svg
                  className=" group-hover:text-gray-900 flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 20"
                >
                  <path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z" />
                </svg>
                <span className="whitespace-nowrap flex-1 ml-3">
                  {" "}
                  <div> View Auctions</div>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to={`createauction/${user?.uid}`}
                className=" hover:bg-gray-100 group flex items-center p-2 text-gray-900 rounded-lg"
              >
                <svg
                  className=" group-hover:text-gray-900 flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 20"
                >
                  <path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z" />
                </svg>
                <span className="whitespace-nowrap flex-1 ml-3">
                  <div>Create Auctions</div>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to={`dashboard/${user?.uid}`}
                className=" hover:bg-gray-100 group flex items-center p-2 text-gray-900 rounded-lg"
              >
                <svg
                  className=" group-hover:text-gray-900 flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 18"
                >
                  <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
                </svg>
                <span className="whitespace-nowrap flex-1 ml-3">
                  <div>Dashboard</div>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to={`test/${user?.uid}`}
                className=" hover:bg-gray-100 group flex items-center p-2 text-gray-900 rounded-lg"
              >
                <svg
                  className=" group-hover:text-gray-900 flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 18 18"
                >
                  <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
                </svg>
                <span className="whitespace-nowrap flex-1 ml-3">
                  <div>Testing</div>
                </span>
              </Link>
            </li>
            <li className="bg-gray-300 h-[1.5px]"></li>
            <li>
              <div
                onClick={logout}
                className=" hover:bg-gray-100 group flex items-center p-2 text-gray-900 rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
                <span className="whitespace-nowrap flex-1 ml-3">
                  <div>SignOut</div>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      {/* Renders child of RootLayout in main.tsx based on url */}
      <Outlet />
    </>
  );
};

export default RootLayout;
