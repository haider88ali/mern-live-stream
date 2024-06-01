import { baseURL, key } from "./Config";

import { CLOSE_SPINNER_PROGRESS, OPEN_SPINNER_PROGRESS } from "../store/spinner/types";
import store from "../store/provider";


export const openSpinner = () => {
  return store.dispatch({ type: OPEN_SPINNER_PROGRESS });
};

export const closeSpinner = () => {
  return store.dispatch({ type: CLOSE_SPINNER_PROGRESS });
};

const token = localStorage.getItem("TOKEN");


export const apiInstanceFetch = {
  baseURL: `${baseURL}`, // Set your default base URL here
  headers: {
    "Content-Type": "application/json",
    key: `${key}`,
    Authorization: `${token}`,
  },
  get: (url) => {
    openSpinner();
    return fetch(`${apiInstanceFetch?.baseURL}${url}`, {
      method: "GET",
      headers: apiInstanceFetch?.headers,
    })
      .then(handleErrors)
      .finally(() => closeSpinner());
  },

  post: (url, data) => {
    openSpinner();
    return fetch(`${apiInstanceFetch.baseURL}${url}`, {
      method: "POST",
      headers: { ...apiInstanceFetch.headers },
      body: JSON.stringify(data),
    })
      .then(handleErrors)
      .finally(() => closeSpinner());
  },

  patch: (url, data) => {
    openSpinner();
    return fetch(`${apiInstanceFetch.baseURL}${url}`, {
      method: "PATCH",
      headers: { ...apiInstanceFetch.headers },
      body: JSON.stringify(data),
    })
      .then(handleErrors)
      .finally(() => closeSpinner());
  },

  put: (url, data) => {
    openSpinner();
    return fetch(`${apiInstanceFetch.baseURL}${url}`, {
      method: "PUT",
      headers: { ...apiInstanceFetch.headers },
      body: JSON.stringify(data),
    })
      .then(handleErrors)
      .finally(() => closeSpinner());
  },

  delete: (url) => {
    openSpinner();
    return fetch(`${apiInstanceFetch.baseURL}${url}`, {
      method: "DELETE",
      headers: apiInstanceFetch.headers,
    })
      .then(handleErrors)
      .finally(() => closeSpinner());
  },
};

function handleErrors(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response?.status}`);
  }
  return response.json();
}
