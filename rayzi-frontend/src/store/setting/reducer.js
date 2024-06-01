import { GET_SETTING, UPDATE_SETTING } from "./types";

const initialState = {
  setting: {},
};

const settingReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_SETTING:
      return {
        ...state,
        setting: action.payload
      };
     
    case UPDATE_SETTING:
      return {
        ...state,
        setting: {
          ...state.setting,
          googlePlaySwitch: action.payload.googlePlaySwitch,
          stripeSwitch: action.payload.stripeSwitch,
          isAppActive: action.payload.isAppActive,
          isFake : action.payload.isFake
        },
      };
    default:
      return state;
  }
};

export default settingReducer;
