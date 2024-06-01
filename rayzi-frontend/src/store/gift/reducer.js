import {
  GET_GIFT,
  CREATE_NEW_GIFT,
  OPEN_GIFT_DIALOG,
  CLOSE_GIFT_DIALOG,
  EDIT_GIFT,
  DELETE_GIFT,
  CREATE_NEW_SVGA,
  OPEN_SVGA_DIALOG,
  CLOSE_SVGA_DIALOG,
} from "./types";

const initialState = {
  gift: [],
  dialog: false,
  dialogData: null,
  dialog1: false,
  dialogData1: null,
};

const giftReducer = (state = initialState, action) => {
  switch (action.type) {
    case GET_GIFT:
      return {
        ...state,
        gift: action.payload,
      };
    case CREATE_NEW_GIFT:
      const data = [...state.gift, ...action.payload];
      return {
        ...state,
        gift: data,
      };

      case CREATE_NEW_SVGA:
        ;
        const updatedGiftArray = state.gift.map((giftCategory) => {
          if (giftCategory?._id === action.payload.categoryID) {
            return {
              ...giftCategory,
              gift: [...giftCategory.gift, action.payload.giftData],
            };
          }
          return giftCategory;
        });
        return {
          ...state,
          gift: updatedGiftArray,
        };
    case EDIT_GIFT:
        
    return {
      ...state,
    gift: state.gift?.map((gift) => {
      return {
        ...gift,
        gift: gift.gift?.map((g) =>
          g._id === action.payload.id ? action.payload.data : g
        ),
      };
    }),
  };
    case DELETE_GIFT:
      return {
        ...state,
        gift: state.gift.map((gift) => {
          return {
            ...gift,
            gift: gift.gift.filter((g) => g._id !== action.payload),
          };
        }),
      };
    case OPEN_GIFT_DIALOG:
      return {
        ...state,
        dialog: true,
        dialogData: action.payload || null,
      };
    case CLOSE_GIFT_DIALOG:
      return {
        ...state,
        dialog: false,
        dialogData: null,
      };
      case OPEN_SVGA_DIALOG:
        return {
          ...state,
          dialog1: true,
          dialogData1: action.payload || null,
        };
      case CLOSE_SVGA_DIALOG:
        return {
          ...state,
          dialog1: false,
          dialogData1: null,
        };
  
    default:
      return state;
  }
};

export default giftReducer;
