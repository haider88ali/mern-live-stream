import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { CLOSE_SVGA_DIALOG } from "../../store/gift/types";
import { connect, useDispatch, useSelector } from "react-redux";
import { createNewGiftSvga } from "../../store/gift/action";
import SVGA from "svgaplayerweb";

import { baseURL } from "../../util/Config";
import { Cancel } from "@material-ui/icons";
import { getCategory } from "../../store/giftCategory/action";
import { Cropper } from "react-advanced-cropper";
import html2canvas from "html2canvas";

const AddSvgaDialogue = (props) => {
  const dispatch = useDispatch();
  const {
    dialog1: open,
    dialogData1,
    gift,
  } = useSelector((state) => state.gift);
 

  const categories = useSelector((state) => state.giftCategory.giftCategory);
  const [images, setImages] = useState([]);
  const [imageData, setImageData] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [mongoId, setMongoId] = useState("");
  const [coin, setCoin] = useState(0);
  const [category, setCategory] = useState("");
  const [isSvga, setIsSvga] = useState(false);
  const [image, setImage] = useState();
  const [cropper, setCropper] = useState(null);
  const [isSubmit, setIsSubmit] = useState(true);
  const imageRef = useRef(null);

  const [errors, setError] = useState({
    coin: "",
    image: "",
    category: "",
  });

  useEffect(() => {
    dispatch(getCategory());
  }, [dispatch]);

  useEffect(() => {
    setIsSubmit(true);
  }, [open]);

  useEffect(() => {
    if (dialogData1) {
      setMongoId(dialogData1._id);
      setCoin(dialogData1.coin);
      setCategory(dialogData1.category._id);
      setImagePath(baseURL + "/" + dialogData1.icon);
      if (dialogData1?.icon?.split(".")?.pop() === "svga") {
        setIsSvga(true);
      }
    }
  }, [dialogData1]);

  const removeImage = () => {
    setImage("");
    setImageData(null);
    setImagePath(null);
    setIsSvga(false);
  };

  useEffect(
    () => () => {
      setError({
        coin: "",
        image: "",
        category: "",
      });
      setMongoId("");
      setCoin(0);
      setCategory("");
      setImages([]);
      setImageData(null);
      setImagePath(null);
      setIsSvga(false);
    },
    [open]
  );

  const handleInputImage = (e) => {
    setImage("");
    if (e.target.files[0]) {
      Object.assign(e.target.files[0], {
        preview: URL.createObjectURL(e.target.files[0]),
      });
      setImageData(e.target.files[0]);
      setImages([e.target.files[0]]);
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        setImagePath(reader.result);
        setError({
          image: "",
        });
      });
      reader.readAsDataURL(e.target.files[0]);

      if (e.target.files[0].name.split(".").pop() === "svga") {
        setIsSvga(true);
      } else {
        setIsSvga(false);
      }
    }
  };
  const imageSvg = useRef();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
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

    if (!coin || !category) {
      const errors = {};

      if (!coin) {
        errors.coin = "Coin can't be a blank!";
      }
      if (!category) {
        errors.category = "Category can't be a blank!";
      }
      if (images.length === 0) {
        errors.image = "Please select an Image!";
      }

      return setError({ ...errors });
    }

    if (mongoId) {
      if (!imageData && !imagePath) {
        return setError({ ...errors, image: "Please select an Image!" });
      }
    } else {
      if (images.length === 0) {
        return setError({ ...errors, image: "Please select an Image!" });
      }
    }

    

    const blob = await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      });
    });

    if (blob) {
      formData.append("svgaImage", blob);
    }

    formData.append("coin", coin);
    formData.append("category", category);

    if (mongoId) {
      formData.append("image", imageData);
    } else {
      for (let i = 0; i < images.length; i++) {
        formData.append("image", images[i]);
      }
    }

    if (mongoId) {
      props.editGift(formData, mongoId);
      closePopup();
    } else {
      closePopup();
      props.createNewGiftSvga(formData, category);
    }
  };

  const closePopup = () => {
    dispatch({ type: CLOSE_SVGA_DIALOG });
  };

  // Payload data and url to upload files
  const getUploadParams = ({ meta }) => {
    return { url: "https://httpbin.org/post" };
  };

  // Return the current status of files being uploaded
  const handleChangeStatus = ({ meta, file }, status) => {
    if (status === "removed") {
      const filteredItems = images.filter((item) => item !== file);
      setImages(filteredItems);
    }

    if (status === "done") {
      images.push(file);
    }
  };

  const onChange = (cropperRef) => {
    setCropper(cropperRef);
  };

  useEffect(() => {
    // ;
    // if (imageData || dialogData) {
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
          parser.load(baseURL + "/" + dialogData1?.icon, function (videoItem) {
            player.setVideoItem(videoItem);
            player.startAnimation();
            setTimeout(() => {
              captureAndSendImage(player, mongoId);
            }, 3000);
          });
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
          <span className="text-danger font-weight-bold h4"> SVGA </span>
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
        <DialogContent>
          <div class="modal-body pt-1 px-1 pb-3">
            <div class="d-flex flex-column">
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
              <form>
                <div class="form-group">
                  <label className="mb-2 text-gray">Coin</label>
                  <input
                    type="number"
                    class="form-control"
                    placeholder="Magic"
                    required
                    value={coin}
                    onChange={(e) => {
                      setCoin(e.target.value);

                      if (!e.target.value) {
                        return setError({
                          ...errors,
                          coin: "coin can't be a blank!",
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

                  <label className="mb-2 mt-2 text-gray">Category</label>

                  <select
                    class="form-select form-control"
                    aria-label="Default select example"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);

                      if (!e.target.value) {
                        return setError({
                          ...errors,
                          category: "Please select a Category!",
                        });
                      } else if (e.target.value == "Category") {
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
                    <option selected>Category</option>
                    {categories.map((category) => {
                      return (
                        <option value={category._id}>{category.name}</option>
                      );
                    })}
                  </select>
                  {errors.category && (
                    <div className="ml-2 mt-1">
                      {errors.category && (
                        <div className="pl-1 text__left">
                          <span className="text-red">{errors.category}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div class="form-group">
                    <label className="mb-2 mt-2 text-gray">Icon</label>
                    {/* {!mongoId && (
                        <>
                          <input
                            class="form-control"
                            type="file"
                            required=""
                            onChange={handleInputImage}
                          />
                          {errors.image && (
                            <div class="pl-1 text-left">
                              <Typography variant="caption" color="error">
                                {errors.image}
                              </Typography>
                            </div>
                          )}
                        </>
                      )} */}

                    {/* {mongoId && ( */}
                    <>
                      <input
                        class="form-control"
                        type="file"
                        required=""
                        accept=".svga, .gift"
                        onChange={handleInputImage}
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
                        <Fragment>
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
                                  boxShadow:
                                    "0 5px 15px 0 rgb(105 103 103 / 00%)",
                                  float: "left",
                                  objectFit: "contain",
                                  marginRight: 15,
                                  width: "350px",
                                  marginBottom: "10px",
                                  height: "350px",
                                }}
                              ></div>
                            </>
                          )}

                          {/* <div
                              class="img-container"
                              style={{
                                display: "inline",
                                position: "relative",
                                float: "left",
                              }}
                            >
                              <i
                                class="fas fa-times-circle material-icons remove_img text-primary"
                                style={{
                                  position: "absolute",
                                  right: "-6px",
                                  top: "10px",
                                  cursor: "pointer",
                                }}
                                onClick={removeImage}
                              ></i>
                            </div> */}
                        </Fragment>
                      )}
                    </>
                    {/* )} */}
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-outline-info ml-2 btn-round float__right icon_margin"
                    onClick={closePopup}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isSubmit}
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

export default connect(null, { getCategory, createNewGiftSvga })(
  AddSvgaDialogue
);
