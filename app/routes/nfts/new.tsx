import React, { createRef, RefObject, useState } from "react";
import { Form, ActionFunction, redirect, useMatches, LoaderFunction, useLoaderData } from "remix";
import { Spinner } from "~/components/spinner";
import { CastInput } from "~/generated/graphql-schema";
import { createCast, exportCast, reorderCast, transferCast, readCast, readCasts } from "~/modules/casts.server";
import { MAKE_PRESIGNED_UPLOAD_URL_ENDPOINT } from "~/modules/media.server";
import { useAccessToken } from "~/modules/session";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";
import { uploadImageToIpfs } from "~/utils/ipfs";

interface LoaderData {
  // The HTTP endpoint to hit to get a presigned URL for image upload.
  // We need to get this from the server since it's in an env variable
  // but the upload will be done client side.
  readonly makePresignedUploadUrlEndpoint: string;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));

  /* Only the server knows the location of the API (from the environment variables), so pass this to the client. */
  return {
    makePresignedUploadUrlEndpoint: MAKE_PRESIGNED_UPLOAD_URL_ENDPOINT,
  };
};

/* Submit a new Cast to the server. */
export const action: ActionFunction = async ({ request }) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));

  const formData = await request.formData();

  // Get and validate the inputs from the form.
  const title = formData.get("title")?.toString();
  if (!title) {
    return "error";
  }
  const ipfsUrl = formData.get("ipfsUrl")?.toString();
  if (!ipfsUrl) {
    return "error";
  }

  try {
    await createCast({
      accessToken: accessToken,
      input: {
        title: title,
        mimeType: "image/*",
        centralizedUri: ipfsUrl,
        uri: ipfsUrl,
      },
    });
  }
  catch (err) {
    console.log(String(err));
  }

  return redirect("/");
};

type UploadState = "Ready" | "Uploading" | "Done" | "Error";

export default function NewCast() {
  const { makePresignedUploadUrlEndpoint } = useLoaderData<LoaderData>();
  const accessToken = useAccessToken();

  if (!accessToken) {
    throw "Impossible; no access token on this page.";
  }

  const uploadFormRef = createRef<HTMLFormElement>();
  const fileInputRef = createRef<HTMLInputElement>();
  const titleInputRef = createRef<HTMLInputElement>();
  const ipfsUrlInputRef = createRef<HTMLInputElement>();
  const imgRef = createRef<HTMLImageElement>();

  const [uploadState, setUploadState] = useState<UploadState>("Ready");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="ml-4">Create an NFT</h1>

      { /* Upload recording button and hidden form. */ }
      <Form method="post" action="/nfts/new" encType="multipart/form-data" ref={uploadFormRef}>
        <label className="flex flex-col gap-4">
          <div className="flex flex-row justify-between">
            <div className="flex items-center justify-center h-64 m-4 border-2 border-dashed border-zinc-400 w-96">
              { /* This is a preview box which shows the image the user has uploaded. */ }
              <img className="object-contain w-full h-full p-3 border-none rounded-lg" ref={imgRef} />
            </div>
            <div className="flex flex-col justify-around flex-grow">
              { /* The input box for the NFT title. The title is used later when exporting to the chain. */ }
              <div>
                <input
                  type="text"
                  name="title"
                  maxLength={50}
                  placeholder="Title"
                  className="w-full my-4"
                  ref={titleInputRef}
                />

                { /* This is a custom button which delegates clicks to the hidden file input field. We can style it however we want. */ }
                <button type="button" disabled={uploadState !== "Ready"} onClick={() => fileInputRef.current?.click()} className="w-full">Upload Image</button>
                <div className="my-8">
                  { /* If we are uploading, add a Spinner. */ }
                  <span className="upload-status-hint">{uploadState === "Uploading" && <Spinner />}</span>

                  { /* If there was an error, just tell the user. Not much else to do. */ }
                  <span className="upload-status-hint">{uploadState === "Error" && <span className="error">Error ocurred during NFT creation.</span>}</span>

                  { /* On success. */ }
                  <span className="upload-status-hint">{uploadState === "Done" && <span>✅ NFT Created!</span>}</span>
                </div>
                { /* The actual image upload input field. We make it hidden for prettiness. */}
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{display: "none"}}
                  onChange={
                    (e) => showImagePreview(e, imgRef)
                  }
                />

                { /* This hidden input element contains the user's accessToken since we need it on the client side. */ }
                <input type="hidden" name="ipfsUrl" ref={ipfsUrlInputRef} />
              </div>

              { /* Submit the form, doing most of the upload client-side. */ }
              <button type="button" onClick={(event) => clientCreateCast(event, uploadFormRef, fileInputRef, titleInputRef, ipfsUrlInputRef, makePresignedUploadUrlEndpoint, setUploadState)} className="my-4">Create NFT</button>
            </div>
          </div>
        </label>
      </Form>
    </section>
  );
}

/** Show a preview of the image uploaded in the given event in the given image element.  */
function showImagePreview(
  event: React.ChangeEvent<HTMLInputElement>,
  imageElement: React.RefObject<HTMLImageElement>
) {
  const files = event.target.files;

  if (files && files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (imageElement.current && e.target?.result) {
        imageElement.current.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(files[0]);
  }
}

/**
 * Handle the submission of the form to create a Cast.
 * We don't just use traditional form submission (Remix style) because the process is a bit more involved.
 */
async function clientCreateCast(
  event: React.FormEvent,
  uploadFormRef: RefObject<HTMLFormElement>,
  fileInput: RefObject<HTMLInputElement>,
  titleInput: RefObject<HTMLInputElement>,
  ipfsUrlInput: RefObject<HTMLInputElement>,
  makePresignedUploadUrlEndpoint: string,
  setUploadState: React.Dispatch<React.SetStateAction<UploadState>>
) {
  if (!uploadFormRef.current) {
    return {
      error: "No form found.",
    };
  }

  if (!fileInput.current?.files?.item(0)) {
    return {
      error: "No file uploaded.",
    };
  }

  if (!titleInput.current?.value) {
    return {
      error: "No title given.",
    };
  }

  if (!ipfsUrlInput.current) {
    return {
      error: "No input in which to place the IPFS URL.",
    };
  }

  const image = fileInput.current.files[0];
  const title = titleInput.current.value;
  const uploadFormRefBackup = uploadFormRef.current;
  const ipfsUrlInputBackup = ipfsUrlInput.current;
  const fileInputBackup = fileInput.current;

  try {
    setUploadState("Uploading");

    // Upload the image to IPFS.
    const imageArrayBuffer = await image.arrayBuffer();
    const imageIpfsUri = await uploadImageToIpfs(imageArrayBuffer);

    ipfsUrlInputBackup.value = imageIpfsUri;

    setUploadState("Done");

    // Submit all this data to the server to create the cast.
    fileInputBackup.value = "";
    uploadFormRefBackup.dispatchEvent(new Event("submit"));
  }
  catch (err) {
    console.log(err);
    setUploadState("Error");
  }
}
