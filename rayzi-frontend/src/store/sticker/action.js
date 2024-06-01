import axios from "axios";
import { Toast } from "../../util/Toast";
import {
  GET_STICKER,
  CREATE_NEW_STICKER,
  EDIT_STICKER,
  CLOSE_STICKER_DIALOG,
  DELETE_STICKER,
} from "./types";
import { apiInstanceFetch } from "../../util/api";

export const getSticker = () => (dispatch) => {
  apiInstanceFetch
    .get(`sticker`)
    .then((res) => {
      if (res.status) {
        dispatch({ type: GET_STICKER, payload: res.sticker });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const createNewSticker = (data) => (dispatch) => {
  
  axios
    .post(`sticker`, data)
    .then((res) => {
      
      if (res.data.status) {
        Toast("success", "Sticker created successfully!");
        dispatch({ type: CLOSE_STICKER_DIALOG });
        dispatch({ type: CREATE_NEW_STICKER, payload: res.data.sticker });
      } else {
        
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const editSticker = (data, id) => (dispatch) => {
  
  axios
    .patch(`sticker/${id}`, data)
    .then((res) => {
      
      if (res.data.status) {
        Toast("success", "Sticker updated successfully!");
        dispatch({ type: CLOSE_STICKER_DIALOG });
        dispatch({
          type: EDIT_STICKER,
          payload: { data: res.data.sticker, id: id },
        });
      } else {
        
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const deleteSticker = (id) => (dispatch) => {
  axios
    .delete(`sticker/${id}`)
    .then((res) => {
      if (res.data.status) {
        dispatch({ type: DELETE_STICKER, payload: id });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => console.log(error));
};
