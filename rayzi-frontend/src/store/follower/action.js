import axios from "axios";
import { Toast } from "../../util/Toast";

import { GET_FOLLOWERS_FOLLOWING_LIST } from "./types";
import { apiInstanceFetch } from "../../util/api";

export const getFollowersFollowing = (type, id) => (dispatch) => {

  apiInstanceFetch
    .get(`followFollowing?type=${type}&userId=${id}`)
    .then((res) => {

      if (res.status) {
        dispatch({
          type: GET_FOLLOWERS_FOLLOWING_LIST,
          payload: res.follow,
        });
      } else {
        Toast("error", res.message);
      }
    })
    .catch((error) => Toast("error", error.message));
};
