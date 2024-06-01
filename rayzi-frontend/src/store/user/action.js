import axios from "axios";
import { Toast } from "../../util/Toast";
import { apiInstanceFetch } from "../../util/api";

import {
  BLOCK_UNBLOCK_SWITCH,
  GET_USER,
  GET_HISTORY,
  EDIT_COIN,
  GET_USER_PROFILE,
} from "./types";

export const getUser =
  (start, limit, searchValue, sDate, eDate) => (dispatch) => {
    apiInstanceFetch
      .get(
        `getUsers?start=${start}&limit=${limit}&search=${searchValue}&startDate=${sDate}&endDate=${eDate}`
      )
      .then((res) => {
        if (res.status) {
          let male, female;
          if (res.maleFemale) {
            res.maleFemale.forEach((data) => {
              if (data._id === "female") female = data.gender;
              if (data._id === "male") male = data.gender;
            });
          }
          dispatch({
            type: GET_USER,
            payload: {
              user: res.user,
              activeUser: res.activeUser,
              total: res.total,
              male: male,
              female: female,
            },
          });
        } else {
          Toast("error", res.message);
        }
      })
      .catch((error) => Toast("error", error.message));
  };

export const handleBlockUnblockSwitch = (userId) => (dispatch) => {
  apiInstanceFetch
    .patch(`blockUnblock/${userId}`)
    .then((res) => {
      if (res.status) {
        dispatch({ type: BLOCK_UNBLOCK_SWITCH, payload: res.user });
        res.user.isBlock === true
          ? Toast("success", "User Block Successfully")
          : Toast("success", "User UnBlock Successfully");
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};

export const userHistory = (data) => (dispatch) => {
  axios
    .post(`history`, data)
    .then((res) => {
      if (res.data.status) {
        dispatch({ type: GET_HISTORY, payload: res.data });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};

export const editCoin = (data) => (dispatch) => {
  axios
    .post(`/user/addLessCoin`, data)
    .then((res) => {
      if (res.data.status) {
        dispatch({
          type: EDIT_COIN,
          payload: { data: res.data.user, id: data.userId },
        });
        Toast("success", "Update Successful!!");
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};

export const userDetail = (id) => (dispatch) => {
  apiInstanceFetch.get(`getProfileByAdmin?userId=${id}`).then((res) => {
    if (res.status) {
      dispatch({ type: GET_USER_PROFILE, payload: res.user });
    } else {
      Toast("error", res.message);
    }
  });
};
