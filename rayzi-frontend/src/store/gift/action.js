import axios from "axios";
import { Toast } from "../../util/Toast";
import {
  GET_GIFT,
  CREATE_NEW_GIFT,
  EDIT_GIFT,
  CLOSE_GIFT_DIALOG,
  DELETE_GIFT,
  CREATE_NEW_SVGA,
  CLOSE_SVGA_DIALOG,
} from "./types";
import { apiInstanceFetch } from "../../util/api";

const GiftClick = localStorage.getItem("GiftClick");

export const getGift = (categoryId) => (dispatch) => {
  apiInstanceFetch
    .get(`gift/${categoryId === "ALL" ? "all" : categoryId}`)
    .then((res) => {
      if (res.status) {
        dispatch({ type: GET_GIFT, payload: res.gift });
      } else {
        // Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const createNewGift = (data) => (dispatch) => {
  axios
    .post(`gift`, data)
    .then((res) => {
      if (res.data.status) {
        Toast("success", "Gift created successfully!");
        dispatch({ type: CLOSE_GIFT_DIALOG });
        dispatch({ type: CREATE_NEW_GIFT, payload: res.data.gift });

        setTimeout(() => {
          GiftClick !== null && (window.location.href = "/admin/gift");
        }, 3000);
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const createNewGiftSvga = (data, categoryID) => (dispatch) => {
  axios
    .post(`gift/svgaAdd`, data)
    .then((res) => {
      if (res.data.status) {
        Toast("success", "Svga created successfully!");
        dispatch({ type: CLOSE_SVGA_DIALOG });
        dispatch({
          type: CREATE_NEW_SVGA,
          payload: {
            categoryID: categoryID,
            giftData: res.data.data,
          },
        });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};

export const editGift = (data, giftId) => (dispatch) => {
  axios
    .patch(`gift/${giftId}`, data)
    .then((res) => {
      if (res.data.status) {
        Toast("success", "Gift updated successfully!");
        dispatch({ type: CLOSE_GIFT_DIALOG });
        dispatch({
          type: EDIT_GIFT,
          payload: { data: res.data.gift, id: giftId },
        });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const deleteGift = (giftId) => (dispatch) => {
  axios
    .delete(`gift/${giftId}`)
    .then((res) => {
      if (res.data.status) {
        dispatch({ type: DELETE_GIFT, payload: giftId });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => console.log(error));
};
