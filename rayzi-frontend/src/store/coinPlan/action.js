import axios from "axios";
import { Toast } from "../../util/Toast";
import {
  CLOSE_COIN_PLAN_DIALOG,
  CREATE_NEW_COIN_PLAN,
  DELETE_COIN_PLAN,
  EDIT_COIN_PLAN,
  GET_COIN_PLAN,
  GET_COIN_PLAN_HISTORY,
  ISTOP_SWITCH_TOGGLE,
} from "./types";
import { apiInstanceFetch } from "../../util/api";

export const getCoinPlan = () => (dispatch) => {
  apiInstanceFetch
    .get(`coinPlan`)
    .then((res) => {
      if (res?.status) {
        dispatch({ type: GET_COIN_PLAN, payload: res?.coinPlan });
      }
    })
    .catch((error) => Toast("error", error.message));
};

export const createNewCoinPlan = (data) => (dispatch) => {
  axios
    .post(`coinPlan`, data)
    .then((res) => {
      if (res.data.status) {
        Toast("success", "Plan created successfully!");
        dispatch({ type: CLOSE_COIN_PLAN_DIALOG });
        dispatch({ type: CREATE_NEW_COIN_PLAN, payload: res.data.coinPlan });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const editCoinPlan = (coinPlanId, data) => (dispatch) => {
  axios
    .patch(`coinPlan/${coinPlanId}`, data)
    .then((res) => {
      if (res.data.status) {
        Toast("success", "Plan updated successfully!");
        dispatch({ type: CLOSE_COIN_PLAN_DIALOG });
        dispatch({
          type: EDIT_COIN_PLAN,
          payload: { data: res.data.coinPlan, id: coinPlanId },
        });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
export const deleteCoinPlan = (coinPlanId) => (dispatch) => {
  axios
    .delete(`coinPlan/${coinPlanId}`)
    .then((res) => {
      if (res.data.status) {
        dispatch({ type: DELETE_COIN_PLAN, payload: coinPlanId });
      } else {
        Toast("error", res.data.message);
      }
    })
    .catch((error) => console.log(error));
};

export const coinPlanHistory =
  (id, start, limit, sDate, eDate) => (dispatch) => {
    const url =
      id !== null
        ? `coinPlan/history?userId=${id}&start=${start}&limit=${limit}&startDate=${sDate}&endDate=${eDate}`
        : `coinPlan/history?start=${start}&limit=${limit}&startDate=${sDate}&endDate=${eDate}`;
    apiInstanceFetch
      .get(url)
      .then((res) => {
        if (res.status) {
          dispatch({
            type: GET_COIN_PLAN_HISTORY,
            payload: { history: res.data.history, total: res.total },
          });
        }
      })
      .catch((error) => console.log(error));
  };

export const isTop = (id) => (dispatch) => {
  apiInstanceFetch.get(`coinPlan/isTopToggle?planId=${id}`).then((res) => {
    if (res.status) {
      debugger;
      dispatch({ type: ISTOP_SWITCH_TOGGLE, payload: res?.data });
      {
        res.data.isTop === true
          ? Toast("success", "Plan now top successfully!")
          : Toast("success", "Plan top Off successfully!");
      }
    } else {
      Toast("error", res.message);
    }
  });
};
