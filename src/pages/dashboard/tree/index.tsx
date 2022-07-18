import { DashboardNavbar } from "@components/navbar/dashboard-navbar";
import { faEye, faFileImage, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Prisma } from "@prisma/client";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import {
  SocialMediaLink,
  SocialMedias,
  Theme,
  Themes,
  SocialMedia,
} from "utils/shared";
import { trpc } from "utils/trpc";
import { useCallback, useMemo, useRef, useState } from "react";
import DraggableList from "@components/draggable-list";
import { SocialMediaCombobox } from "@components/combobox";
import { z } from "zod";
import { useValue, useZorm } from "react-zorm";
import ErrorLabel from "@components/error-label";
import { Toast, ToastElement } from "@components/toast";

interface treeLocalStorage {
  slug?: string | null;
  bio?: string | null;
  theme?: string | null;
  image?: string | null;
  ads_enabled?: boolean;
  links?: {
    id: string;
    position: number;
    media: SocialMedia;
    url: string;
  }[];
}

function parsePrisma<T>(json: Prisma.JsonValue): T {
  if (typeof json === "string") {
    return JSON.parse(json);
  } else return JSON.parse(JSON.stringify(json));
}

const postTreeSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(20)
    .regex(/^@/, { message: "Must start with a @" }),
  bio: z.string().max(200).optional(),
  theme: z.enum(Themes),
  links: z
    .array(
      z.object({
        position: z.string().transform((arg) => parseInt(arg)),
        id: z.string(),
        media: z.enum(SocialMedias),
        url: z.string().min(1).max(160),
      })
    )
    .optional(),
  ads_enabled: z.string().optional().transform(Boolean),
});

const Index: NextPage = () => {
  const {
    data: tree,
    isLoading,
    isError,
  } = trpc.useQuery(["tree.get-my-tree"], {
    onSuccess(data) {
      if (data) {
        window?.localStorage.setItem(
          "tree",
          JSON.stringify({
            ...data,
            links: data?.links
              ? parsePrisma<SocialMediaLink[]>(data?.links)
              : ([] as SocialMediaLink[]),
          })
        );
      }
    },
    refetchOnWindowFocus: false,
  });

  const postTree = trpc.useMutation(["tree.post-tree"]);
  const checkSlug = trpc.useMutation(["tree.check-slug"]);
  const uploadImage = trpc.useMutation(["tree.get-presigned-post"]);

  const [dataTheme, setDataTheme] = useState<typeof Themes[number]>();
  const currentTheme: Theme = useMemo(
    () => dataTheme || (tree?.theme as Theme) || "light",
    [dataTheme, tree]
  );
  const fileRef = useRef<File | null>();
  const imageRef = useRef<HTMLImageElement | null>(null);
  const toast = useRef<ToastElement | null>(null);

  const links = useMemo(
    () =>
      tree?.links
        ? parsePrisma<SocialMediaLink[]>(tree?.links)
        : ([] as SocialMediaLink[]),
    [tree]
  );

  const zo = useZorm("post-tree", postTreeSchema, {
    customIssues: checkSlug.data?.issues,
    async onValidSubmit(e) {
      e.preventDefault();
      // alert(JSON.stringify(e.data, null, 2));
      let url: string | undefined = undefined;

      if (uploadImage.data !== undefined) {
        const { post, imageId } = uploadImage.data;

        if (post !== undefined) {
          const formData = new FormData();

          if (fileRef.current !== undefined) {
            const file = fileRef.current;
            if (file) {
              Object.entries({
                ...post.fields,
                file,
              }).forEach(([key, value]) => {
                formData.append(key, value);
              });

              await fetch(post.url, {
                method: "POST",
                body: formData,
              });
              url = imageId;
            }
          }
        }
      }
      postTree.mutate(
        { ...e.data, image: url },
        {
          onSuccess() {
            if (toast.current) {
              toast.current.show();
            }
          },
        }
      );
    },
  });

  const treeStorage = useCallback(
    (callback: (storage: treeLocalStorage) => treeLocalStorage): void => {
      if (typeof window === undefined) return;
      const treeLocalStorage = window.localStorage.getItem("tree");

      const currentStorage = treeLocalStorage
        ? JSON.parse(treeLocalStorage)
        : {};

      window.localStorage.setItem(
        "tree",
        JSON.stringify(callback(currentStorage))
      );
    },
    []
  );

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Toast
        options={{
          position: "br",
          duration: 5000,
          transition: {
            duration: 0.2,
          },
        }}
        ref={toast}
      >
        <div className="alert alert-success shadow-lg">
          <div>
            <FontAwesomeIcon
              onClick={(event) => {
                event.stopPropagation();
                toast.current?.hide();
              }}
              icon={faXmark}
              className="opacity-75 hover:cursor-pointer hover:opacity-50 active:opacity-25"
            />
            <div>
              <h3 className="font-bold">Successfull change!</h3>
            </div>
          </div>
          <div className="flex-none">
            <Link href={`/${tree?.slug}`}>
              <a
                target="_blank"
                rel="noreferrer"
                role="button"
                className="btn btn-outline btn-sm normal-case"
              >
                View changes
              </a>
            </Link>
          </div>
        </div>
      </Toast>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-col space-y-4 px-24">
          <DashboardNavbar />
          <main>
            {tree && (
              <form className="flex flex-col" ref={zo.ref}>
                <div className="flex flex-row">
                  <div className="flex flex-1 flex-col">
                    <DraggableList
                      items={links}
                      onAdd={(item) => {
                        treeStorage((storage) => {
                          storage.links = storage.links
                            ? [...storage.links, item]
                            : [item];
                          return storage;
                        });
                      }}
                      onRemove={(item) => {
                        treeStorage((storage) => {
                          storage.links = storage.links
                            ? storage.links.filter((v) => v.id !== item.id)
                            : [];
                          return storage;
                        });
                      }}
                      onReorder={(items) => {
                        // items contains only id
                        // might find a better ways to sort things

                        treeStorage((storage) => {
                          const storageLinks = storage.links;
                          if (!storageLinks) return storage;
                          const sorted: typeof storageLinks = [];
                          items.forEach((item) => {
                            const f = storageLinks.find(
                              (l) => l.id === item.id
                            );
                            if (!f) return;
                            sorted.push(f);
                          });
                          storage.links = sorted;
                          return storage;
                        });
                      }}
                      renderItem={(item, index) => {
                        return (
                          <div className="relative flex w-full flex-row items-center space-x-2">
                            <input
                              type="hidden"
                              value={item.id}
                              name={zo.fields.links(index).id()}
                            />
                            <div>
                              <input
                                type="hidden"
                                value={index}
                                name={zo.fields.links(index).position()}
                              />
                              <SocialMediaCombobox
                                name={zo.fields.links(index).media()}
                                defaultValue={item.media}
                                onChange={(media) => {
                                  treeStorage((storage) => {
                                    const storageLinks = storage.links;
                                    if (!storageLinks) return storage;
                                    const storageLink = storageLinks.find(
                                      (link) => link.id === item.id
                                    );
                                    if (!storageLink) return storage;
                                    storageLink.media = media.handle;
                                    return storage;
                                  });
                                }}
                              />
                            </div>
                            <div className="flex w-full flex-col justify-start">
                              <input
                                name={zo.fields.links(index).url()}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  treeStorage((storage) => {
                                    const storageLinks = storage.links;
                                    if (!storageLinks) return storage;
                                    const storageLink = storageLinks.find(
                                      (link) => link.id === item.id
                                    );
                                    if (!storageLink) return storage;
                                    storageLink.url = event.target.value;
                                    return storage;
                                  });
                                }}
                                defaultValue={item.url}
                                type="text"
                                placeholder={`https://folllow.link/${tree.slug}`}
                                className={`input input-bordered w-full ${
                                  zo.errors.links(index).url()?.code
                                    ? "ring-2 ring-red-500/80"
                                    : ""
                                }`}
                              />
                              <div className="absolute -bottom-4">
                                {zo.errors.links(index).url((err) => {
                                  return <ErrorLabel message={err.message} />;
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </div>
                  <div className="flex flex-col space-y-4">
                    <div className="kard flex flex-row items-center justify-between p-6 ">
                      <Link href="/dashboard/tree/preview">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          role="button"
                          className="btn btn-outline gap-2 normal-case"
                        >
                          <FontAwesomeIcon icon={faEye} />
                          Live Preview
                        </a>
                      </Link>
                      <button
                        type="submit"
                        disabled={
                          zo.validation?.success === false ||
                          !!checkSlug.data?.issues.length
                        }
                        className="btn gap-2 normal-case"
                      >
                        Save changes
                      </button>
                    </div>
                    <div className="kard flex flex-row items-center space-x-4 p-6 ">
                      <div className="self-start">
                        <div className="relative">
                          <div className="avatar w-24">
                            {tree?.image ? (
                              <img
                                ref={imageRef}
                                src={
                                  imageRef.current
                                    ? imageRef.current.src
                                    : `${tree.image}?${performance.now()}`
                                }
                                className="h-auto w-auto rounded-full"
                              />
                            ) : (
                              <img
                                ref={imageRef}
                                src={
                                  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs="
                                }
                                className="placeholder h-auto w-auto rounded-full"
                              />
                            )}
                          </div>
                          <div className="absolute right-0 bottom-0">
                            <div className="relative flex h-10 w-10 flex-col items-center justify-center overflow-hidden rounded-full bg-neutral hover:bg-neutral/90 ">
                              <input
                                onChange={async (event) => {
                                  event.stopPropagation();
                                  const file = event.target.files?.[0];
                                  if (file === undefined) return;

                                  fileRef.current = file;
                                  if (!imageRef.current) return;
                                  imageRef.current.src =
                                    URL.createObjectURL(file);

                                  const filename = encodeURIComponent(
                                    file.name
                                  );

                                  uploadImage.mutate({ filename });

                                  treeStorage((storage) => {
                                    storage.image = URL.createObjectURL(file);
                                    return storage;
                                  });
                                }}
                                type="file"
                                accept="image/png, image/jpeg"
                                className="absolute top-0 right-0 z-10 h-full cursor-pointer opacity-0"
                              />
                              <FontAwesomeIcon
                                icon={faFileImage}
                                className="text-xl text-neutral-content"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-4">
                        <div>
                          <label className="text-xs">Your slug:</label>
                          <input
                            className="input input-bordered w-full max-w-xs"
                            type="text"
                            placeholder="@folllow.link"
                            defaultValue={tree.slug}
                            name={zo.fields.slug()}
                            onChange={(event) => {
                              event.stopPropagation();
                              treeStorage((storage) => {
                                storage.slug = event.target.value;
                                return storage;
                              });
                            }}
                            onBlur={(event) => {
                              const validateBeforeTry = z
                                .string()
                                .regex(/^@/)
                                .safeParse(event.target.value);
                              if (validateBeforeTry.success) {
                                checkSlug.mutate({ slug: event.target.value });
                              }
                            }}
                          />
                          <div className="pt-2">
                            {zo.errors.slug((err) => {
                              return <ErrorLabel message={err.message} />;
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs">Your bio:</label>
                          <textarea
                            className="textarea textarea-bordered"
                            placeholder={
                              "Hi, \nthis is created with folllow.link !"
                            }
                            defaultValue={tree.bio || ""}
                            name={zo.fields.bio()}
                            onChange={(event) => {
                              event.stopPropagation();
                              treeStorage((storage) => {
                                storage.bio = event.target.value;
                                return storage;
                              });
                            }}
                          ></textarea>
                          {zo.errors.bio((err) => {
                            return <ErrorLabel message={err.message} />;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="kard flex flex-col space-y-4 p-6">
                      <div className="text-2xl font-bold">Themes</div>
                      <div className="rounded-box grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
                        <input
                          type="hidden"
                          value={currentTheme}
                          name={zo.fields.theme()}
                        />
                        {Themes.map((theme) => (
                          <button
                            type="button"
                            key={theme}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDataTheme(theme);

                              treeStorage((storage) => {
                                storage.theme = theme;
                                return storage;
                              });
                            }}
                            data-theme={theme}
                            className={`${
                              theme === currentTheme ? "ring-2" : ""
                            } overflow-hidden rounded-lg border border-base-content/20 outline-2 outline-offset-2 outline-base-content ring-primary hover:border-base-content/40`}
                          >
                            <div className="w-full cursor-pointer bg-base-100 font-sans text-base-content">
                              <div className="grid grid-cols-5 grid-rows-3">
                                <div className="col-start-1 row-span-2 row-start-1 bg-base-200"></div>
                                <div className="col-start-1 row-start-3 bg-base-300"></div>
                                <div className="col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 bg-base-100 p-2">
                                  <div className="font-bold capitalize">
                                    {theme}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <div className="flex aspect-square w-5 items-center justify-center rounded bg-primary lg:w-6">
                                      <div className="text-sm font-bold text-primary-content">
                                        A
                                      </div>
                                    </div>
                                    <div className="flex aspect-square w-5 items-center justify-center rounded bg-secondary lg:w-6">
                                      <div className="text-sm font-bold text-secondary-content">
                                        A
                                      </div>
                                    </div>
                                    <div className="flex aspect-square w-5 items-center justify-center rounded bg-accent lg:w-6">
                                      <div className="text-sm font-bold text-accent-content">
                                        A
                                      </div>
                                    </div>
                                    <div className="flex aspect-square w-5 items-center justify-center rounded bg-neutral lg:w-6">
                                      <div className="text-sm font-bold text-neutral-content">
                                        A
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="kard space-y-4 p-2">
                      <div className="form-control">
                        <label className="label cursor-pointer">
                          <span className="label-text font-bold">
                            Enable Ads
                          </span>
                          <input
                            type="checkbox"
                            name={zo.fields.ads_enabled()}
                            defaultChecked={tree.ads_enabled || true}
                            className="checkbox"
                            onChange={(event) => {
                              event.stopPropagation();
                              treeStorage((storage) => {
                                storage.ads_enabled = event.target.checked;
                                return storage;
                              });
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

//   type ServerSideProps = InferGetServerSidePropsType<typeof getServerSideProps>;
//   export async function getServerSideProps(context: GetServerSidePropsContext) {
//     return {
//       props: { },
//     };
//   }

export default Index;