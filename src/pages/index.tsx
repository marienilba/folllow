import type { NextPage } from "next";
import Head from "next/head";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const Index: NextPage = () => {
  const { data: session, status } = useSession();

  return (
    <>
      <Head>
        <title>Folllow</title>
        <meta name="description" content="Folllow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-col px-24">
          <div className="flex flex-row items-center p-6">
            <div className="flew-row flex flex-1 items-center justify-start space-x-10">
              <a className="btn rounded-full bg-black text-xl normal-case text-white hover:bg-black active:bg-black">
                Folllow.
              </a>
              <a className="font-medium hover:cursor-pointer hover:opacity-75">
                Features
              </a>
            </div>
            <div className="flew-row flex items-center justify-start space-x-10">
              {status === "loading" ? (
                <div></div>
              ) : (
                <div>
                  {status === "unauthenticated" ? (
                    <Link href="/sign-in" passHref>
                      <a role="button" className="btn btn-primary normal-case">
                        Sign In
                      </a>
                    </Link>
                  ) : (
                    <AnimatePresence>
                      <motion.div
                        transition={{
                          duration: 0.25,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-row items-center space-x-8"
                      >
                        <Link href="/dashboard" passHref>
                          <a className=" font-medium hover:opacity-75">
                            Dashboard
                          </a>
                        </Link>
                        <div className="dropdown-end dropdown">
                          <div className="relative h-10 w-10">
                            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 ">
                              {session?.user?.image ? (
                                <label
                                  tabIndex={0}
                                  className="avatar h-12 w-12 hover:cursor-pointer"
                                >
                                  <img
                                    src={session?.user.image}
                                    className="mask mask-hexagon h-auto w-auto"
                                  />
                                </label>
                              ) : (
                                <label
                                  tabIndex={0}
                                  className="avatar placeholder w-12 hover:cursor-pointer"
                                >
                                  <div className="mask mask-hexagon w-12 rounded-full bg-base-200"></div>
                                </label>
                              )}
                            </div>
                          </div>
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu rounded-box w-52 bg-base-100 p-2 shadow"
                          >
                            <li role="button">
                              <Link href="/settings/account" passHref>
                                <a>Settings</a>
                              </Link>
                            </li>
                            <li role="button" onClick={() => signOut()}>
                              <a>Log out</a>
                            </li>
                          </ul>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hero grow bg-base-100">
          <div className="hero-content text-center">
            <div className="max-w-xl">
              <h1 className="w-full animate-bg-linear rounded-lg bg-gradient-to-r from-green-400 via-pink-500 to-blue-500 bg-[length:400%] bg-clip-text text-8xl font-extrabold  text-transparent">
                Folllow.
              </h1>
              <p className="py-6">
                Because bad typos can happen{" "}
                <span className="text-2xl">😮‍💨</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
