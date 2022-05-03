import { ActionFunction } from "remix";
import { exportCast } from "~/modules/casts.server";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";

export const action: ActionFunction = async ({ request }) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));

  const formData = await request.formData();

  const address = formData.get("address")?.toString();
  const id = formData.get("id")?.toString();
  const txId = formData.get("txId")?.toString();

  if (!address || !id || !txId) {
    return {
      error: "Invalid inputs to export action.",
    };
  }

  try {
    await exportCast({
      accessToken: accessToken,
      address,
      id,
      txId,
    });
  }
  catch {
    return {
      error: "Error exporting.",
    };
  }
};
