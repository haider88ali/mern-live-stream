import React, { createRef } from "react";

// Redux
import { useSelector } from "react-redux";

//css
import "../assets/css/custom.css";

const Spinner = () => {
  const open = useSelector((state) => state.spinner.networkProgressDialog);

  return (
    <>
      {open && (
        <div className="mainLoader">
          <div className="lds-ripple">
            <div></div>
          </div>
        </div>
      )}
    </>
  );
};

export default Spinner;
