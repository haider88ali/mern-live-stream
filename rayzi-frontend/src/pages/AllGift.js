import React, { useEffect } from "react";

//redux
import { useSelector, connect, useDispatch } from "react-redux";

//serverpath
import { baseURL } from "../util/Config";

//sweet alert
import { alert, warning } from "../util/Alert";

//action
import { deleteGift } from "../store/gift/action";

// type
import { OPEN_GIFT_DIALOG } from "../store/gift/types";

//routing
import { useHistory } from "react-router-dom";

//image
import noImage from "../assets/images/noImage.png";

import SVGA from "svgaplayerweb";

const AllGift = (props) => {
  const dispatch = useDispatch();
  const history = useHistory();
 

  // useEffect(() => {
  //   props.data?.gift?.map((gift, index) => {
  //     if (gift.image.split(".").pop() === "svga") {
  //       const player = new SVGA.Player(`div[attr="${index}"]`);
  //       const parser = new SVGA.Parser();

  //       parser.load(baseURL  + gift.image, (videoItem) => {
  //         player.setVideoItem(videoItem);
  //         player.startAnimation();
  //       });
  //     }
  //   });
  // }, []);

  const handleDelete = (giftId) => {
    const data = warning();
    data
      .then((isDeleted) => {
        if (isDeleted) {
          
          props.deleteGift(giftId);
          alert("Deleted!", `Gift has been deleted!`, "success");
        }
      })
      .catch((err) => console.log(err));
  };

  const handleEdit = (data) => {
    dispatch({ type: OPEN_GIFT_DIALOG, payload: data });
  };
  return (
    <>
      {props.data?.gift?.length > 0 ? (
        props.data?.gift?.map((data, index) => {
          return (
            <>
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
                    <div className="row px-3 py-4 ">
                      <div className="col-4 ps-4">
                     
                        {data?.type === 2  ? (
                          <img
                          src={data?.svgaImage ? baseURL + data?.svgaImage : noImage}
                          width="70px"
                          height="70px"
                          alt="img"
                          style={{
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                          class="mr-3"
                        />
                        ) : (
                        
                        <img
                        src={data?.image ? baseURL + data?.image : noImage}
                        width="70px"
                        height="70px"
                        alt="img"
                        style={{
                          objectFit: "contain",
                          borderRadius: "50%",
                        }}
                        class="mr-3"
                      />
                        )}
                      </div>

                      <div
                        className="col-8 text-end pe-4"
                        style={{
                          padding: 0,
                          paddingLeft: 5,
                        }}
                      >
                        <div class="contact-card-info mt-2 mb-5 px-3">
                          <h2 className="text-white">Coin: {data.coin}</h2>
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
    </>
  );
};

export default connect(null, { deleteGift })(AllGift);