/* eslint-disable no-mixed-operators */
import React, { useEffect, useState } from "react";

// routing
import { Link, useHistory } from "react-router-dom";

// react dropzone
import ReactDropzone from "react-dropzone";

// action
import { getCategory } from "../../../store/giftCategory/action";
import { createNewGift } from "../../../store/gift/action";

// redux
import { connect, useDispatch, useSelector } from "react-redux";



import SVGA from "svgaplayerweb";

const GiftPage = (props) => {
  const history = useHistory();
  const dispatch = useDispatch();

  const categoryDetail = JSON.parse(localStorage.getItem("Category"));
 
  const { dialog: open, dialogData } = useSelector((state) => state.gift);
  console.log(dialogData);

  const [type, setType] = useState(0);
  const [isSvga, setIsSvga] = useState(false);
  const [coin, setCoin] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState([]);
  const [showSvg, setShowSvg] = useState();

  const GiftClick = localStorage.getItem("GiftClick");
  const [errors, setError] = useState({
    image: "",
    coin: "",
    category: "",
  });

  useEffect(() => {
    if (GiftClick !== null) {
      dispatch(getCategory());
    } 
  }, [dispatch]);

  const categories = useSelector((state) => state.giftCategory.giftCategory);

  useEffect(() => {
    setError({
      image: "",
      coin: "",
      category: "",
    });
    setCategory("");
    setCoin("");
    setImages([]);
    setIsSvga(false);
  }, []);
  // // for .svga file

  const onPreviewDrop = (files) => {
    setError({ ...errors, image: "" });

    files.forEach((file, index) => {
      Object.assign(file, { preview: URL.createObjectURL(file) });
      setImages((prevImages) => prevImages.concat(file));

      if (file?.preview && file?.preview.split(".").pop() === "svga") {
        const container = document.getElementById(`svga-container-${index}`);

        if (container) {
          const player = new SVGA.Player(container);
          const parser = new SVGA.Parser(container);

          parser.load(file.preview, (videoItem) => {
            player.setVideoItem(videoItem);
            player.startAnimation();
          });
        }
      }
    });
  };

  const removeImage = (file) => {
    if (file.preview) {
      const image = images.filter((ele) => {
        return ele.preview !== file.preview;
      });
      setImages(image);
      setIsSvga(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !coin ||
      (GiftClick !== null && (category === "Select Category" || !category)) ||
      images.length === 0
    ) {
      const errors = {};

      if (!coin) errors.coin = "Coin is Required!";

      if (images.length === 0) errors.image = "Please select an Image!";

      if (GiftClick !== null && (category === "Select Category" || !category)) {
        errors.category = "Please select a Category!";
      }
      return setError({ ...errors });
    }

    const coinValid = isNumeric(coin);
    if (!coinValid) {
      return setError({ ...errors, coin: "Invalid Coin!!" });
    }

    const formData = new FormData();

    formData.append("category", category ? category : categoryDetail._id);
    formData.append("coin", coin);
    for (let i = 0; i < images.length; i++) {
      formData.append("imageVideo", images[i]);
    }
    // formData.append("type", type);

    
    props.createNewGift(formData);

    setTimeout(() => {
      GiftClick === null && history.push("/admin/giftCategory/gift");
    }, 3000);
  };

  const isNumeric = (value) => {
    const val = value === "" ? 0 : value;
    const validNumber = /^\d+$/.test(val);
    return validNumber;
  };

  return (
    <>
      <div className="page-title">
        <div className="row">
          <div className="col-12 col-md-6 order-md-1 order-last">
            <h3 className="mb-3 text-light">Gift Dialog</h3>
          </div>
          <div className="col-12 col-md-6 order-md-2 order-first">
            <nav
              aria-label="breadcrumb"
              className="breadcrumb-header float-start float-lg-end"
            >
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/admin/dashboard" className="text-danger">
                    Dashboard
                  </Link>
                </li>
                <li className="breadcrumb-item">
                  <Link to="/admin/giftCategory/gift" className="text-danger">
                    Gift
                  </Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Dialog
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="card">
            <div class="card-body card-overflow">
              <div class="d-sm-flex align-items-center justify-content-between mb-4"></div>

              <form>
                <div className="row">
                  <div className="col-md-6">
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
                  </div>
                  <div className="col-md-6">
                    <div className="form-group">
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
                  </div>
                </div>

                <div className="row mt-4">
                  <div className="col-lg-2">
                    <label className="form-control-label" for="input-username">
                      Select (Multiple) Image or GIF
                    </label>

                    <>
                      <ReactDropzone
                        onDrop={(acceptedFiles) => onPreviewDrop(acceptedFiles)}
                        accept="image/*"
                      >
                        {({ getRootProps, getInputProps }) => (
                          <section>
                            <div {...getRootProps()}>
                              <input {...getInputProps()} />
                              <div
                                style={{
                                  height: 130,
                                  width: 130,
                                  border: "2px dashed gray",
                                  textAlign: "center",
                                  marginTop: "10px",
                                }}
                              >
                                <i
                                  className="fas fa-plus"
                                  style={{ paddingTop: 30, fontSize: 70 }}
                                ></i>
                              </div>
                            </div>
                          </section>
                        )}
                      </ReactDropzone>

                      {errors.image && (
                        <div className="ml-2 mt-1">
                          {errors.image && (
                            <div className="pl-1 text__left">
                              <span className="text-red">{errors.image}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  </div>
                  <div className="col-lg-10 mt-4">
                    {images.length > 0 && (
                      <>
                        {images?.map(
                          (file, index) =>
                            file?.type?.split("image")[0] === "" && (
                              <>
                                {!file?.preview?.split(".").pop() == "svga" ? (
                                  <img
                                    src={file?.preview}
                                    alt=""
                                    class="mt-3 rounded float-left mb-2"
                                    height="100px"
                                    width="100px"
                                  />
                                ) : (
                                  <div
                                    id="svga"
                                    attr={index}
                                    style={{
                                      boxShadow:
                                        "0 5px 15px 0 rgb(105 103 103 / 00%)",
                                      marginTop: 10,
                                      float: "left",
                                      objectFit: "contain",
                                      marginRight: 15,
                                      height: "100px",
                                      width: "100px",
                                    }}
                                  ></div>
                                )}
                                <div
                                  class="img-container"
                                  style={{
                                    display: "inline",
                                    position: "relative",
                                    float: "left",
                                  }}
                                >
                                  <i
                                    class="fas fa-times-circle text-danger"
                                    style={{
                                      position: "absolute",
                                      right: "10px",
                                      top: "4px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => removeImage(file)}
                                  ></i>
                                </div>
                              </>
                            )
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    className="btn btn-outline-info ml-2 btn-round float__right icon_margin"
                    onClick={() => {
                      GiftClick === null
                        ? history.push("/admin/giftCategory/gift")
                        : history.push("/admin/gift");
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-round float__right btn-danger"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default connect(null, { createNewGift, getCategory })(GiftPage);
