import React, { useEffect, useState } from "react";

//redux
import { connect, useDispatch, useSelector } from "react-redux";

//action
import { getGift, deleteGift } from "../../store/gift/action";

//config
import { baseURL } from "../../util/Config";
//routing
import { Link, useHistory } from "react-router-dom";
// type
import { OPEN_GIFT_DIALOG, OPEN_SVGA_DIALOG } from "../../store/gift/types";
// dialog
import GiftDialog from "../dialog/Gift/Edit";
//sweet alert
import { warning } from "../../util/Alert";

//all gift
import AllGift from "../../pages/AllGift";

//image
import noImage from "../../assets/images/noImage.png";

import SVGA from "svgaplayerweb";
import AddSvgaDialogue from "./AddSvgaDialogue";

const GiftTable = (props) => {
  const history = useHistory();
  const dispatch = useDispatch();
  const [data, setData] = useState([]);

  const category = JSON.parse(localStorage.getItem("Category"));

  const GiftClick = localStorage.getItem("GiftClick");

  useEffect(() => {
    GiftClick === null
      ? dispatch(getGift(category._id))
      : dispatch(getGift("ALL"));
  }, [dispatch, GiftClick]);

  const gift = useSelector((state) => state.gift.gift);

 

  useEffect(() => {
    setData(gift);
  }, [gift]);

  // // for .svga file
  // useEffect(() => {
  //   if (data.length > 0 &&
  //    data.map((gift, index) => {
  //       if (gift.icon.split(".").pop() === "svga") {
  //         var player = new SVGA.Player(`div[attr="${index}"]`);
  //         var parser = new SVGA.Parser(`div[attr="${index}"]`);
  //         parser.load(baseURL + "/" + gift.icon, function (videoItem) {
  //           player.setVideoItem(videoItem);
  //           player.startAnimation();
  //         });
  //       }
  //     });
  //   }
  // }, [data, rowsPerPage]);
  useEffect(() => {
    data.map((gift, index) => {
      if (gift.image.split(".").pop() === "svga") {
        const player = new SVGA.Player(`div[attr="${index}"]`);
        const parser = new SVGA.Parser();

        parser.load(baseURL + "/" + gift.icon, (videoItem) => {
          player.setVideoItem(videoItem);
          player.startAnimation();
        });
      }
    });
  }, [data]);
  const handleSearch = (e) => {
    const value = e.target.value.toUpperCase()
      ? e.target.value.trim().toUpperCase()
      : e.target.value.trim();
    if (value) {
      const data = gift.filter((data) => {
        return (
          data?.coin?.toString()?.indexOf(value) > -1 ||
          data?.category?.name?.toUpperCase()?.indexOf(value) > -1
        );
      });
      setData(data);
    } else {
      return setData(gift);
    }
  };

  const handleDelete = (giftId) => {
    const data = warning();
    data
      .then((isDeleted) => {
        if (isDeleted) {
          
          props.deleteGift(giftId);
          // alert("Deleted!", `Gift has been deleted!`, "success");
        }
      })
      .catch((err) => console.log(err));
  };

  const handleEdit = (data) => {
    dispatch({ type: OPEN_GIFT_DIALOG, payload: data });
  };

  const handleOpen = () => {
    dispatch({ type: OPEN_SVGA_DIALOG });
  };

  return (
    <>
      <div className="page-title">
        <div className="row">
          <div className="col-12 col-md-6 order-md-1 order-last">
            <h3 className="mb-3 text-white">
              {GiftClick === null && category.name} Gifts
            </h3>
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
                  <Link to="/admin/giftCategory" className="text-danger">
                    Category
                  </Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Gift
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>
      <div class="main-wrapper">
        <div className="row">
          <div className="col-xs-12 col-sm-12 col-md-6 col-lg-8 float-left">
            <div class="dropdown">
              <button
                className="btn waves-effect waves-light btn-danger btn-sm float-left dropdown-toggle"
                type="button"
                id="dropdownMenuButton1"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                New
              </button>
              <ul
                className="dropdown-menu"
                aria-labelledby="dropdownMenuButton1"
                style={{ backgroundColor: "#181821", marginTop: "10px" }}
              >
                <li>
                  <a className="dropdown-item" onClick={handleOpen}>
                    SVGA
                  </a>
                </li>
                <li>
                  <a
                    className="dropdown-item"
                    onClick={() => {
                      GiftClick === null
                        ? history.push("/admin/giftCategory/gift/dialog")
                        : history.push("/admin/gift/dialog");
                    }}
                  >
                    Image,GIF
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="col-xs-12 col-sm-12 col-md-6 col-lg-4 float-right mt-3 mb-3 mt-lg-0 mt-xl-0">
            <form action="">
              <div className="input-group mb-3 border rounded-pill">
                <div className="input-group-prepend border-0">
                  <div id="button-addon4" className="btn text-danger">
                    <i className="fas fa-search mt-2"></i>
                  </div>
                </div>
                <input
                  type="search"
                  placeholder="What're you searching for?"
                  aria-describedby="button-addon4"
                  className="form-control bg-none border-0 rounded-pill searchBar"
                  style={{ background: "#181821" }}
                  onChange={handleSearch}
                />
              </div>
            </form>
          </div>
        </div>
        <div class="row">
          {data.length > 0 ? (
            data.map((data, index) => {
              return (
                <>
                  {GiftClick === null ? (
                    <div
                      class="col-12 col-sm-12 col-md-6 col-lg-4 col-xl-4 col-xxl-4"
                      key={index}
                      onClick={() => {
                        localStorage.setItem("CategoryId", data._id);
                        history.push("/admin/giftCategory/gift");
                      }}
                    >
                      <div class="card contact-card card-bg">
                        <div class="card-body p-1">
                          <div className="row px-3 py-4">
                            <div className="col-4 ps-4">
                              {data.image.split(".").pop() !== "svga" ? (
                                <img
                                  src={
                                    data.image ? baseURL + data.image : noImage
                                  }
                                  width="70px"
                                  height="70px"
                                  alt="img"
                                  style={{
                                    objectFit: "contain",
                                    borderRadius: "50%",
                                  }}
                                  class="mr-3"
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
                                    height: "60px",
                                    width: "60px",
                                  }}
                                ></div>
                              )}
                            </div>
                            <div
                              className="col-8 pe-4 text-end"
                              style={{
                                padding: 0,
                                paddingLeft: 5,
                              }}
                            >
                              <div class="contact-card-info mt-2 mb-3 px-3 mb-5">
                                <h2 className="text-white">
                                  Coin: {data.coin}
                                </h2>
                                {GiftClick !== null && (
                                  <h6>{data.category.name}</h6>
                                )}
                              </div>

                              <div className="px-3">
                                <i
                                  class="fas fa-edit text-white p-2 bg-primary rounded-circle"
                                  style={{ marginRight: 10, fontSize: 25 }}
                                  onClick={() => handleEdit(data)}
                                ></i>

                                <i
                                  class="fas fa-trash text-white p-2 bg-danger rounded-circle"
                                  style={{ marginRight: 10, fontSize: 25 }}
                                  onClick={() => handleDelete(data._id)}
                                ></i>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="row  order-md-1 order-last">
                        <h3 className="mb-3 text-white">{data.name} Gifts</h3>
                        <AllGift data={data} />
                      </div>
                    </>
                  )}
                </>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" align="center">
                Nothing to show!!
              </td>
            </tr>
          )}
        </div>
      </div>
      <GiftDialog />
      <AddSvgaDialogue />
    </>
  );
};

export default connect(null, { getGift, deleteGift })(GiftTable);
