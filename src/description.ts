import {Logger} from "./lib/logger";

const logger = new Logger("description");

logger.log("description page");

browser.runtime.onMessage.addListener(
  function (message, sender, sendResponse) {
    if (message.method == "getDescription") {
      let description = (window.getSelection() || "").toString();
      if (!description || description == "") {
        const metas = document.getElementsByTagName("meta");
        for (let i = 0; i < metas.length; i++) {
          if (metas[i].getAttribute("name") === "description") {
            description = metas[i].getAttribute("content") as string;
            break;
          }
        }
      }
      sendResponse({
        data: description
      });
    }
  }
);
