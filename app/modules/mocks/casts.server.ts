import { QueryReadAuthenticateArgs, Cast } from "~/generated/graphql-schema";

export async function readCasts(args: QueryReadAuthenticateArgs): Promise<Cast[]> {
  const mockData = [{
    id: "qjrojfkdslfjas",
    index: 0,
    mimeType: "image/jpg",
    uri: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_light_color_272x92dp.png",
    history: [{
      epoch: "4324141",
      event: "transfer",
      target: "jojois74",
    }, {
      epoch: "43523523",
      event: "export",
      target: "0xqury493nyrtnwtyopwihvt34",
    }],
  }];
  return Promise.resolve(mockData.concat(mockData, mockData));
}
