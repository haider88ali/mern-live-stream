import {
  GET_HASHTAG,
  CREATE_NEW_HASHTAG,
  OPEN_HASHTAG_DIALOG,
  CLOSE_HASHTAG_DIALOG,
  EDIT_HASHTAG,
  DELETE_HASHTAG,
} from "./types";

const initialState = {
  hashtag: [],
  dialog: false,
  dialogData: null,
};

const hashtagReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_HASHTAG:
      return {
        ...state,
        hashtag: action.payload,
      };
    case CREATE_NEW_HASHTAG:
      const data = [...action.payload,...state.hashtag ]
      return {
        ...state,
        hashtag: data,
      };
    case EDIT_HASHTAG:
      
      return {
        ...state,
        hashtag: state.hashtag.map((hashtag) => hashtag?._id === action?.payload?.id ? action?.payload?.data : hashtag),
      };
    case DELETE_HASHTAG:
      return {
        ...state,
        hashtag: state.hashtag.filter(
          (hashtag) => hashtag._id !== action.payload
        ),
      };
    case OPEN_HASHTAG_DIALOG:
      return {
        ...state,
        dialog: true,
        dialogData: action.payload || null,
      };
    case CLOSE_HASHTAG_DIALOG:
      return {
        ...state,
        dialog: false,
        dialogData: null,
      };

    default:
      return state;
  }
};

export default hashtagReducer;
