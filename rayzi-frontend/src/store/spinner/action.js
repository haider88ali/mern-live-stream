// actions.js
import store from "../provider";
import { OPEN_SPINNER_PROGRESS, CLOSE_SPINNER_PROGRESS } from "./types";

export const openSpinner = () => {
  return store.dispatch({ type: OPEN_SPINNER_PROGRESS });
};

export const closeSpinner = () => {
  return store.dispatch({ type: CLOSE_SPINNER_PROGRESS });
};
