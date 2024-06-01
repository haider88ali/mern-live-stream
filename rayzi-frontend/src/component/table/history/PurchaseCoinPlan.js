import React from "react";
import { Link, useHistory } from "react-router-dom";

const PurchaseCoinPlan = (props) => {
  const history = useHistory();

  const handleUserInfo = (user) => {

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.removeItem("userFollow");
    history.push("/admin/user/detail");
    // history.push({ pathname: "/admin/user/detail", state: user?._id });
  };
  return (
    <table class="table table-striped mt-5">
      <thead>
        <tr>
          <th>No.</th>
          <th>User Name</th>
          <th>Diamond</th>
          <th>Dollar</th>
          <th>Rupee</th>
          <th>Payment Gateway</th>
          <th>Purchase Date</th>
        </tr>
      </thead>
      <tbody>
        {props.data?.length > 0 ? (
          props.data.map((data, index) => {
            return (
              <tr key={index}>
                <td>{index + 1}</td>
                onClick={() => handleUserInfo(data)}
                <td >{data.name}</td>
                <td className="text-primary">{data.diamond}</td>
                <td className="text-info">{data.dollar}</td>
                <td className="text-success">{data.rupee}</td>
                <td className="text-danger">{data.paymentGateway}</td>
                <td>{data.purchaseDate}</td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="7" align="center">
              Nothing to show!!
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default PurchaseCoinPlan;
