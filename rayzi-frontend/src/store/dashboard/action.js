import axios from "axios";
import { Toast } from "../../util/Toast";

import { GET_ANALYTIC, GET_DASHBOARD } from "./types";
import { apiInstanceFetch } from "../../util/api";

export const getDashboard = () => (dispatch) => {
  apiInstanceFetch
    .get(`dashboard`)
    .then((res) => {
      if (res.status) {
        dispatch({ type: GET_DASHBOARD, payload: res.dashboard });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => {
      Toast("error", error.message);
    });
};

export const getAnalytic = (type, start, end) => (dispatch) => {
  apiInstanceFetch
    .get(`dashboard/analytic?type=${type}&startDate=${start}&endDate=${end}`)
    .then((res) => {
      if (res.status) {
        dispatch({ type: GET_ANALYTIC, payload: res.analytic });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => {
      Toast("error", error.message);
    });
};




