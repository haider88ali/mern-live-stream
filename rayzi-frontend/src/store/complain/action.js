import axios from "axios";
import {Toast} from "../../util/Toast";

import {GET_COMPLAIN, SOLVED_COMPLAIN} from "./types";
import { apiInstanceFetch } from "../../util/api";

export const getComplain = (type) => (dispatch) => {
  apiInstanceFetch
    .get(`complain?type=${type}`)
    .then((res) => {
      if (res.status) {
        dispatch({type: GET_COMPLAIN, payload: res.complain});
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => {
      console.log(error);
      Toast("error", error.message);
    });
};

export const solvedComplain = (id) => (dispatch) => {
  axios
    .patch(`complain/${id}`)
    .then((res) => {
      if (res.data.status) {
        dispatch({type: SOLVED_COMPLAIN, payload: res.data.complain});
        Toast("success", "Complain Solved Successfully");
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => {
      console.log(error);
      Toast("error", error.message);
    });
};
