import React, { createRef, RefObject, useState } from "react";
import { Form, ActionFunction, redirect, useMatches, LoaderFunction, useLoaderData } from "remix";
import { Spinner } from "~/components/spinner";
import { CastInput } from "~/generated/graphql-schema";
import { createCast, exportCast, reorderCast, transferCast, readCast, readCasts } from "~/modules/casts.server";
import { MAKE_PRESIGNED_UPLOAD_URL_ENDPOINT } from "~/modules/media.server";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";

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
  const formData = await request.formData();

  // Get and validate the inputs from the form.
  const title = formData.get("title")?.toString();
  if (!title) {
    return "error";
  }

  // TODO: submit using createCast.
};

type UploadState = "Ready" | "Uploading" | "Done" | "Error";

export default function NewCast() {
  const { makePresignedUploadUrlEndpoint } = useLoaderData<LoaderData>();

  const uploadFormRef = createRef<HTMLFormElement>();
  const fileInputRef = createRef<HTMLInputElement>();
  const imgRef = createRef<HTMLImageElement>();

  const [uploadState, setUploadState] = useState<UploadState>("Ready");

  return (
    <section className="flex flex-col gap-4 py-8">
      <h1>Create an NFT</h1>

      { /* Upload recording button and hidden form. */ }
      <form encType="multipart/form-data" ref={uploadFormRef} onSubmit={(event) => clientCreateCast(event, fileInputRef, makePresignedUploadUrlEndpoint)}>
        <label className="flex flex-col gap-4">
          { /* The input box for the NFT title. The title is used later when exporting to the chain. */ }
          <input type="text" name="title" />

          { /* This is a custom button which delegates clicks to the hidden file input field. We can style it however we want. */ }
          <button type="button" disabled={uploadState !== "Ready"} onClick={() => fileInputRef.current?.click()}>Upload Image</button>

          { /* This is a preview box which shows the image the user has uploaded. */ }
          <img className="max-w-lg max-h-lg" ref={imgRef} />

          { /* If we are uploading, add a Spinner. */ }
          <span className="upload-status-hint">{uploadState === "Uploading" && <Spinner />}</span>

          { /* If there was an error, just tell the user. Not much else to do. */ }
          <span className="upload-status-hint">{uploadState === "Error" && <span className="error">Error ocurred during NFT creation.</span>}</span>

          { /* On success. */ }
          <span className="upload-status-hint">{uploadState === "Done" && <span>✅ NFT Created!</span>}</span>

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

          { /* Submit the form, doing most of the upload client-side. */ }
          <button type="submit">Create NFT!</button>
        </label>
      </form>
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
async function clientCreateCast(event: React.FormEvent, fileInput: RefObject<HTMLInputElement>, makePresignedUploadUrlEndpoint: string) {
  event.preventDefault();

  if (!fileInput.current?.files?.item(0)) {
    return {
      error: "No file uploaded",
    };
  }

  const image = fileInput.current.files[0];

  try {
    // First: get an authenticated (presigned) URL to the S3 bucket where we can directly upload our image.
    const presignedUrl = await getPresignedUrlForImageUpload(makePresignedUploadUrlEndpoint, {
      accessToken: accessToken, pieceId: piece.id,
    });

    // Second: upload the image to the bucket.
    const centralizedImageUri = await userPresignedUrlToUploadImage(presignedUrl);

    // Third: upload the image to IPFS.
    const imageIpfsUri = null;

    // Fourth: submit all this data to the server to create the cast.
  }
  catch {
    setUploadState("Error");
  }
}

async function getPresignedUrlForImageUpload(makePresignedUploadUrlEndpoint: string, makePresignedUploadUrlRequestData: object) {
  const response = await fetch(makePresignedUploadUrlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(makePresignedUploadUrlRequestData),
  });
  if (response.status !== 200) {
    setUploadState("Error");
    return;
  }
  return (await response.json()).signedUrl;
}

async function userPresignedUrlToUploadImage(presignedUrl: string) {
  const putResponse = await fetch(presignedUrl, {
    method: "PUT",
    body: await files[0].arrayBuffer(),
  });
  if (putResponse.status === 200) {
    setUploadState("Done");
  }
  else {
    setUploadState("Error");
  }
}

/** If the form's file input has a file, submit the form programmatically. */
async function inputFileOnChange(
  event: React.ChangeEvent<HTMLInputElement>,
  makePresignedUploadUrlEndpoint: string,
  makePresignedUploadUrlRequestData: object,
  setUploadState: (state: UploadState) => void,
  form: HTMLFormElement | null
) {
  if (form) {
    const files = event.target.files;
    if (files && files.length >= 1 && files[0]) {
      try {
        setUploadState("Uploading");

        // Client uploading of audio files has two parts.
        // 1. Get a presigned URL.
        const response = await fetch(makePresignedUploadUrlEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(makePresignedUploadUrlRequestData),
        });
        if (response.status !== 200) {
          setUploadState("Error");
          return;
        }

        // 2. Now that we have a presigned URL, PUT the audio file at the URL.
        // Note: we don't use FormData because we want to post only the audio bytes.
        const responseData = await response.json();
        const putResponse = await fetch(responseData.signedUrl, {
          method: "PUT",
          body: await files[0].arrayBuffer(),
        });
        if (putResponse.status === 200) {
          setUploadState("Done");
        }
        else {
          setUploadState("Error");
        }
      }
      catch {
        setUploadState("Error");
      }
    }
  }
}
