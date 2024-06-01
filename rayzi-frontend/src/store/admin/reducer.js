import setToken from "../../util/SetToken";
import setDevKey from "../../util/SetDevKey";
import jwt_decode from "jwt-decode";
import { key } from "../../util/Config";

import {
  CLOSE_ADMIN_DIALOG,
  OPEN_ADMIN_DIALOG,
  SET_ADMIN,
  UNSET_ADMIN,
  UPDATE_IMAGE_PROFILE,
  UPDATE_PROFILE,
} from "./types";

const initialState = {
  isAuth: false,
  admin: {},
};

const adminReducer = (state = initialState, action) => {
  let decoded;

  switch (action.type) {
    case SET_ADMIN:
      if (action.payload) {
        decoded = jwt_decode(action.payload);
      }
      setToken(action.payload);
      setDevKey(key);
      localStorage.setItem("TOKEN", action.payload);
      localStorage.setItem("KEY", key);
      return {
        ...state,
        isAuth: true,
        admin: decoded,
      };

    case UNSET_ADMIN:
      localStorage.removeItem("TOKEN");
      localStorage.removeItem("KEY");
      localStorage.removeItem("firstLoad");
      localStorage.removeItem("CategoryDetail");
      localStorage.removeItem("CategoryId");
      localStorage.removeItem("PostDetail");
      localStorage.removeItem("VideoDetail");
      setDevKey(null);
      setToken(null);
      return {
        ...state,
        isAuth: false,
        admin: {},
      };

    case UPDATE_PROFILE:
      return {
        ...state,
        admin: {
          ...state.admin,
          _id: action.payload._id,
          name: action.payload.name,
          email: action.payload.email,
          image: action.payload.image,
          flag: action.payload.flag,
        },
      };
    case UPDATE_IMAGE_PROFILE:
      return {
        ...state,
        admin: {
          name: action.payload.name,
          image: action.payload.image,
        },
      };
    case OPEN_ADMIN_DIALOG:
      return {
        ...state,
        dialog: true,
        dialogData: action.payload || null,
      };
    case CLOSE_ADMIN_DIALOG:
      return {
        ...state,
        dialog: false,
        dialogData: null,
      };
    default:
      return state;
  }
};

export default adminReducer;
