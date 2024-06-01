import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import { Cancel } from "@material-ui/icons";
import React, { useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { CLOSE_ADMIN_DIALOG, UNSET_ADMIN } from "../../store/admin/types";
import axios from "axios";
import { Toast } from "../../util/Toast";

const UpdatePassword = () => {
  const { dialog: open, dialogData } = useSelector((state) => state.admin);
 

  const dispatch = useDispatch();
  const history = useHistory();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const changePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      const errors = {};

      if (!oldPassword) errors.oldPassword = "Require this Filed!";
      if (!newPassword) errors.newPassword = "Require this Filed!";
      if (!confirmPassword) errors.confirmPassword = "Require this Filed!";

      return setErrors({ ...errors });
    }

    setError("");
    if (confirmPassword !== newPassword) {
      return setError("Password & Confirm Password do not match ❌");
    }
    
    axios
      .put(`/admin`, {
        oldPass: oldPassword,
        newPass: newPassword,
        confirmPass: confirmPassword,
      })
      .then((res) => {
        if (res.data.status) {
          Toast("success", "Change Admin Password Successfully ✔");
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setTimeout(() => {
            dispatch({ type: UNSET_ADMIN });
            history.push("/");
          }, 1000);
        } else {
          Toast("error", res.data.message);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const closePopup = () => {
    dispatch({ type: CLOSE_ADMIN_DIALOG });
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
        maxWidth="sm"
      >
        <DialogTitle id="responsive-dialog-title">
          <span className="text-danger font-weight-bold h4">
            {" "}
            Update Password{" "}
          </span>
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
          <div className="modal-body pt-1 px-1 pb-3">
            <div className="d-flex flex-column">
              <form>
                <div class="edu-section">
                  <div class="row">
                    <div class="col-md-12">
                      <div class="form-group">
                        <label for="degree1">Old Password</label>
                        <input
                          type="password"
                          class="form-control "
                          id="degree1"
                          placeholder="Add your old password here..."
                          onChange={(event) => {
                            setOldPassword(event.target.value);
                            if (!event.target.value) {
                              return setErrors({
                                ...errors,
                                oldPassword: "Require this Filed!",
                              });
                            } else {
                              return setErrors({
                                ...errors,
                                oldPassword: "",
                              });
                            }
                          }}
                        />
                        {errors.oldPassword && (
                          <span style={{ color: "#009688" }}>
                            {errors.oldPassword}
                          </span>
                        )}
                      </div>
                    </div>

                    <div class="col-md-12 mt-4">
                      <div class="form-group">
                        <label for="degree1">New Password</label>
                        <input
                          type="password"
                          class="form-control "
                          id="degree1"
                          placeholder="Add your new password here..."
                          onChange={(event) => {
                            setNewPassword(event.target.value);
                            if (!event.target.value) {
                              return setErrors({
                                ...errors,
                                newPassword: "Require this Filed!",
                              });
                            } else {
                              return setErrors({
                                ...errors,
                                newPassword: "",
                              });
                            }
                          }}
                        />
                        {errors.newPassword && (
                          <span style={{ color: "#009688" }}>
                            {errors.newPassword}
                          </span>
                        )}
                      </div>
                    </div>
                    <div class="col-md-12 mt-4">
                      <div class="form-group">
                        <label for="degree1">confirm Password</label>
                        <input
                          type="password"
                          class="form-control"
                          style={{ backgroundColor: "#141B2D" }}
                          id="degree1"
                          placeholder="confirm your new password here..."
                          // value="Royal Collage of Art Designer Illustrator"
                          onChange={(event) => {
                            setConfirmPassword(event.target.value);
                            if (!event.target.value) {
                              return setErrors({
                                ...errors,
                                confirmPassword: "Require this Filed!",
                              });
                            } else {
                              return setErrors({
                                ...errors,
                                confirmPassword: "",
                              });
                            }
                          }}
                        />
                        {errors.confirmPassword && (
                          <span style={{ color: "#009688" }}>
                            {errors.confirmPassword}
                          </span>
                        )}
                        {error && (
                          <span style={{ color: "#009688" }}>{error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    className="btn btn-outline-info ml-2 btn-round float__right icon_margin"
                    onClick={closePopup}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-round float__right btn-danger"
                    onClick={changePassword}
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

export default UpdatePassword;
