/* eslint-disable no-mixed-operators */
import React, { useEffect, useRef, useState } from "react";

//redux
import { connect, useDispatch, useSelector } from "react-redux";

//MUI
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import { Cancel } from "@material-ui/icons";

//types
import { CLOSE_GIFT_DIALOG } from "../../../store/gift/types";

//action
import { editGift } from "../../../store/gift/action";
import { getCategory } from "../../../store/giftCategory/action";

// server path
import { baseURL } from "../../../util/Config";



import SVGA from "svgaplayerweb";
import { Cropper } from "react-advanced-cropper";
import html2canvas from "html2canvas";

const GiftDialog = (props) => {
  const dispatch = useDispatch();

  const { dialog: open, dialogData } = useSelector((state) => state.gift);

  const GiftClick = localStorage.getItem("GiftClick");

  const [mongoId, setMongoId] = useState("");
  const [coin, setCoin] = useState("");
  const [category, setCategory] = useState("");
  const [imageData, setImageData] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [type, setType] = useState(0);
  const [isSvga, setIsSvga] = useState(true);
  const [image, setImage] = useState("");
  const [cropper, setCropper] = useState(null);
  const [isSubmit, setIsSubmit] = useState(true);
  const imageRef = useRef(null);

  const categoryDetail = JSON.parse(localStorage.getItem("Category"));

 

  useEffect(() => {
    dispatch(getCategory());
  }, [dispatch]);

  const categories = useSelector((state) => state.giftCategory.giftCategory);

  const [errors, setError] = useState({
    image: "",
    coin: "",
    category: "",
  });

  useEffect(() => {
    if (dialogData) {
      setMongoId(dialogData?._id);
      setCoin(dialogData?.coin);
      setCategory(dialogData?.category._id);
      setImagePath(baseURL + dialogData?.image);
      if (dialogData?.image?.split(".")?.pop() === "svga") {
        setIsSvga(true);
      }
    }
  }, [dialogData]);

  useEffect(() => {
    if (dialogData) {
      setMongoId(dialogData._id);
      setCoin(dialogData.coin);
      setCategory(
        GiftClick === null ? dialogData.category._id : dialogData.category
      );
      setImagePath(baseURL + dialogData.image);
    }
  }, [dialogData, GiftClick]);

  // for .svga file
  useEffect(() => {
    if (isSvga) {
      if (!!document.getElementById("svga") && imagePath) {
        var player = new SVGA.Player(`div[attr="${mongoId}"]`);
        var parser = new SVGA.Parser(`div[attr="${mongoId}"]`);
        if (imageData?.preview) {
          parser.load(imageData.preview, function (videoItem) {
            player.setVideoItem(videoItem);
            player.startAnimation();
          });
        } else {
          parser.load(baseURL + dialogData?.image, function (videoItem) {
            player.setVideoItem(videoItem);
            player.startAnimation();
          });
        }
      }
    }
  }, [imageData, isSvga, imagePath]);

  useEffect(
    () => () => {
      setError({
        image: "",
        coin: "",
        category: "",
      });
      setCategory("");
      setCoin("");
      setImageData(null);
      setImagePath(null);
      setIsSubmit(true);
      setIsSvga(false);
    },
    [open]
  );

  const HandleInputImage = (e) => {
    if (e.target.files[0]) {
      setImageData(e.target.files[0]);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImagePath(reader.result);
      });
      reader.readAsDataURL(e.target.files[0]);
      setIsSubmit(true);
    }
    if (e.target.files[0]?.name?.split(".")?.pop() === "svga") {
      setIsSvga(true);
    } else {
      setIsSvga(false);
    }
  };

  const closePopup = () => {
    dispatch({ type: CLOSE_GIFT_DIALOG });
  };

  const handleSubmit = async (e) => {
    const formData = new FormData();
    if (isSvga) {
      const coordinates = cropper.getCoordinates();
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = coordinates.width;
      canvas.height = coordinates.height;
      context.drawImage(
        imageRef.current,
        coordinates.left,
        coordinates.top,
        coordinates.width,
        coordinates.height,
        0,
        0,
        coordinates.width,
        coordinates.height
      );
      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        });
      });

      if (blob) {
        formData.append("svgaImage", blob);
      }
    }
    if (
      (!imageData && !imagePath) ||
      !coin ||
      (GiftClick !== null && (!category || category === "Select Category"))
    ) {
      const errors = {};

      if (!coin) errors.coin = "Coin is Required!";

      if (!imageData && !imagePath) errors.image = "Please select an Image!";

      if (GiftClick !== null && (category === "Select Category" || !category)) {
        errors.category = "Please select a Category!";
      }
    }
    const coinValid = isNumeric(coin);
    if (!coinValid) {
      return setError({ ...errors, coin: "Invalid Coin!!" });
    }

    if (isSvga) {
      if (mongoId) {
        formData.append("image", imageData);
      } else {
        formData.append("image", image);
      }
    } else {
      if (mongoId) {
        formData.append("image", imageData);
      } else {
        formData.append("image", image);
      }
    }
    formData.append("coin", coin);
    formData.append("type", type);
    GiftClick !== null && formData.append("category", category);

    

    props.editGift(formData, mongoId);
  };

  const isNumeric = (value) => {
    const val = value === "" ? 0 : value;
    const validNumber = /^\d+$/.test(val);
    return validNumber;
  };

  const onChange = (cropperRef) => {
    setCropper(cropperRef);
  };

  useEffect(() => {
    if (isSvga) {
      if (!!document.getElementById("svga") && imagePath) {
        var player = new SVGA.Player(`div[attr="${mongoId}"]`);
        var parser = new SVGA.Parser(`div[attr="${mongoId}"]`);
        if (imageData?.preview) {
          parser.load(imageData.preview, function (videoItem) {
            player.setVideoItem(videoItem);
            player.startAnimation();
            setTimeout(() => {
              captureAndSendImage(player, mongoId);
            }, 3000);
          });
        } else {
          parser.load(
            baseURL + dialogData?.image,
            function (videoItem) {
              player.setVideoItem(videoItem);
              player.startAnimation();
              setTimeout(() => {
                captureAndSendImage(player, mongoId);
              }, 3000);
            },
            function (error) {
              console.error("Error loading SVGA file:", error);
            }
          );
        }
      }
    } else {
      setIsSubmit(false);
    }
  }, [imageData, isSvga, imagePath]);

  const captureAndSendImage = (player, index) => {
    return new Promise((resolve) => {
      player.pauseAnimation();
      const container = document.querySelector(`div[attr="${index}"]`);
      const canvas = document.createElement("canvas");
      if (!container) {
        console.error(`Container element with attr="${index}" not found.`);
        return;
      }
      // Set the desired width and height for the canvas
      const width = container.offsetWidth;
      const height = container.offsetHeight;

      canvas.width = width;
      canvas.height = height;

      html2canvas(container, {
        canvas: canvas,
        width: width,
        height: height,
        scale: 1,
      }).then((canvas) => {
        const data = canvas.toDataURL("image/png");
        resolve(data);
        setImage(data);
        setIsSubmit(false);
      });
    });
  };

  return (
    <>
      <Dialog
        open={open}
        aria-labelledby="responsive-dialog-title"
        onClose={closePopup}
        disableBackdropClick
        disableEscapeKeyDown
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="responsive-dialog-title">
          <span className="text-danger font-weight-bold h4"> Gift </span>
        </DialogTitle>

        <IconButton
          style={{
            position: "absolute",
            right: 0,
          }}
        >
          <Tooltip title="Close">
            <Cancel className="text-danger" onClick={closePopup} />
          </Tooltip>
        </IconButton>
        <DialogContent style={{ overflowY: "hidden" }}>
          <div className="modal-body pt-1 px-1 pb-3">
            <div className="d-flex flex-column">
              {isSvga && (
                <div
                  style={{ position: "absolute", opacity: "0", zIndex: "-111" }}
                >
                  <Cropper
                    defaultCoordinates={{
                      height: 221,
                      left: 77,
                      top: 128,
                      width: 192,
                    }}
                    src={image}
                    onChange={onChange}
                    className={"cropper"}
                  />
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Original"
                    style={{ display: "none" }}
                  />
                </div>
              )}

              <form>
                <div className="form-group">
                  <label className="mb-2 text-gray">Coin</label>
                  <input
                    type="number"
                    className="form-control"
                    required=""
                    placeholder="20"
                    value={coin}
                    onChange={(e) => {
                      setCoin(e.target.value);
                      if (!e.target.value) {
                        return setError({
                          ...errors,
                          coin: "Coin is Required!",
                        });
                      } else {
                        return setError({
                          ...errors,
                          coin: "",
                        });
                      }
                    }}
                  />
                  {errors.coin && (
                    <div className="ml-2 mt-1">
                      {errors.coin && (
                        <div className="pl-1 text__left">
                          <span className="text-red">{errors.coin}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="form-group mt-4">
                  <label className="text-gray mb-2">Category</label>
                  {GiftClick === null ? (
                    <input
                      type="text"
                      className="form-control"
                      required=""
                      placeholder="Category Name"
                      disabled
                      value={categoryDetail.name}
                    />
                  ) : (
                    <>
                      <select
                        class="form-select form-control"
                        aria-label="Default select example"
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          if (e.target.value === "Select Category") {
                            return setError({
                              ...errors,
                              category: "Please select a Category!",
                            });
                          } else {
                            return setError({
                              ...errors,
                              category: "",
                            });
                          }
                        }}
                      >
                        <option value="Select Category" selected>
                          Select Category
                        </option>
                        {categories.map((category) => {
                          return (
                            <option value={category._id}>
                              {category.name}
                            </option>
                          );
                        })}
                      </select>
                      {errors.category && (
                        <div className="ml-2 mt-1">
                          {errors.category && (
                            <div className="pl-1 text__left">
                              <span className="text-red">
                                {errors.category}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="form-group mt-4">
                  <label className="mb-2 text-gray">Select Image or GIF</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    required=""
                    accept=".gif, .image"
                    onChange={HandleInputImage}
                  />
                  {errors.image && (
                    <div className="ml-2 mt-1">
                      {errors.image && (
                        <div className="pl-1 text__left">
                          <span className="text-red">{errors.image}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {imagePath && (
                    <>
                      {!isSvga ? (
                        <img
                          src={imagePath}
                          class="mt-3 rounded float-left mb-2"
                          height="100px"
                          width="100px"
                        />
                      ) : (
                        <>
                          <div
                            id="svga"
                            attr={mongoId}
                            style={{
                              boxShadow: "0 5px 15px 0 rgb(105 103 103 / 00%)",
                              float: "left",
                              objectFit: "contain",
                              marginRight: 15,
                              marginBottom: "10px",
                              width: "350px",
                              height: "350px",
                            }}
                          ></div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className={imagePath ? "mt-5 pt-5" : "mt-5"}>
                  <button
                    type="button"
                    className="btn btn-outline-info ml-2 btn-round float__right icon_margin"
                    onClick={closePopup}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isSvga ? isSubmit : false}
                    className="btn btn-round float__right btn-danger"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default connect(null, { editGift, getCategory })(GiftDialog);
