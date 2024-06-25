
const book = require("../models/bookingModel");
const resort = require("../models/resortModel");
const User = require("../models/userModel");
const { checkout } = require("../routers/Route");
const dotenv = require("dotenv");
dotenv.config();
const { STRIPE_KEY } = process.env;
const server_url = process.env.CLIENT_URL.trim();

const stripe = require("stripe")(STRIPE_KEY);

module.exports.searchDate = async (req, res) => {
  try {
    const { selectedPlace, checkInDate, checkOutDate } = req.body;
    console.log(checkInDate);
    console.log(checkOutDate);

    const bookedData = await book.find({ status: "booked" });

    console.log(bookedData, "bd");

    const resorts = bookedData.filter((booking) => {
      if (
        (new Date(checkInDate) >= new Date(booking.fromDate) &&
          new Date(checkInDate) <= new Date(booking.toDate)) ||
        (new Date(checkOutDate) >= new Date(booking.fromDate) &&
          new Date(checkOutDate) <= new Date(booking.toDate))
      ) {
        return booking.resortId;
      }
    });

    console.log("------------------resorts-----------", resorts);
    const resortIds = resorts.map((resort) => {
      return resort.resortId;
    });
    console.log("--------------resortIDs------", resortIds);
    const dateData = await resort
      .find({
        $and: [
          { _id: { $nin: resortIds } },
          { "location.district": selectedPlace },
          { is_delete: false },
        ],
      })
      .populate("location.district");

    console.log(dateData, "dateeeeeeeee");
    return res.status(200).json({
      status: true,
      message: "successfully done it",
      date: dateData,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.getBookedResort = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    const bookedData = await resort
      .findById({ _id: id })
      .populate("location.district");
    console.log(bookedData, "BDZ");
    return res.status(200).json({
      status: true,
      message: "successfully done it",
      resort: bookedData,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.payment = async (req, res) => {
  try {
    const { resortId, paymentt, users, checkInDate, checkOutDate } = req.body;
    console.log(req.body, "payment on reach");
    const data = await resort.findById({ _id: resortId });

    let Booking = new book({
      resortId: resortId,
      userId: users,
      fromDate: checkInDate,
      toDate: checkOutDate,
      payment: {
        payment_amount: data.price,
        payment_method: paymentt,
      },
    });
    await Booking.save();
    return res.status(200).json({
      status: true,
      message: "successful",
    });
    console.log(Booking, "BOX");
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.checkSingleResort = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, resort_id } = req.params;
    console.log(checkInDate);
    console.log(checkOutDate);
    const bookedData = await book.find({
      $and: [{ status: "booked" }, { resortId: resort_id }],
    });

    console.log(bookedData, "bd");

    const resorts = bookedData.filter((booking) => {
      if (
        (new Date(checkInDate) >= new Date(booking.fromDate) &&
          new Date(checkInDate) <= new Date(booking.toDate)) ||
        (new Date(checkOutDate) >= new Date(booking.fromDate) &&
          new Date(checkOutDate) <= new Date(booking.toDate))
      ) {
        return booking.resortId;
      }
    });

    console.log("------------------resorts-----------", resorts);

    if (!resorts.length) {
      return res.status(200).json({
        status: true,
        message: "available",
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "unavailable",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.bookingManagement = async (req, res) => {
  try {
    const bookedData = await book
      .find({
        $or: [{}, { status: "booked" }, { status: "cancelled" }],
      })
      .populate("resortId");

    console.log(bookedData);
    return res.status(200).json({
      status: true,
      message: "successfully done it",
      book: bookedData,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.paymentStripe = async (req, res) => {
  try {
    const { resortId, paymentt, userId, checkInDate, checkOutDate } = req.body;
    console.log(resortId, "RID");
    console.log(paymentt, "RIP");
    console.log(userId, "USD");
    console.log(checkInDate, "CK");
    console.log(checkOutDate, "Cd");
    const resortData = await resort.findById({ _id: resortId });

    console.log(resortData, "RD");
    let resortPrice = resortData.price;
    console.log(resortPrice);
    if (paymentt === "online") {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "INR",
              product_data: {
                name: `${resortData.resortname}`,
              },
              unit_amount: resortPrice * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${server_url}/successPage?session_id={CHECKOUT_SESSION_ID}&resortId=${resortData._id}`,
        cancel_url: `${server_url}/cancel`,
      });

      return res.status(200).json({
        status: true,
        url: session.url,
      });
    } else if (paymentt === "wallet") {
      const userData = await User.findById(userId);
      console.log(userData, "usr");
      if (userData.wallet >= resortData.price) {
        let Booking = new book({
          resortId: resortId,
          userId: userId,
          fromDate: checkInDate,
          toDate: checkOutDate,
          payment: {
            payment_amount: resortData.price,
            payment_method: paymentt,
          },
        });
        await Booking.save();

        return res.status(200).json({
          status: true,
          message: "success",
          payMethod: paymentt,
        });
      } else {
        return res.status(400).json({ message: "Not enough balance in wallet" });
      }
    }
  } catch (error) {
    console.log(error.message);
    return res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports.paymentSuccess = async (req, res) => {
  try {
    const { paymentId, resortId, users, checkInDate, checkOutDate } = req.body;

    console.log("-------start------------");
    const paymentChecking = await stripe.checkout.sessions.retrieve(paymentId);

    const data = await resort.findById({ _id: resortId });

    if (paymentChecking.payment_status === "paid") {
      let Booking = new book({
        resortId: resortId,
        userId: users,
        fromDate: checkInDate,
        toDate: checkOutDate,
        payment: {
          payment_amount: data.price,
          payment_method: "Online",
        },
      });
      await Booking.save();
      return res.status(200).json({
        status: true,
        message: "successful",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.paymentHistory = async (req, res) => {
  try {
    const users = req.params.id;
    console.log(req.params, "urd");
    console.log(users, "urs");

    const bookedHistory = await book
      .find({ userId: users })
      .populate({ path: "resortId", populate: "location.district" });
    console.log(bookedHistory[0].resortId.location.district, "bH");
    return res.status(200).json({
      status: true,
      message: "successfully done it",
      booked: bookedHistory,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};

module.exports.cancelBooking = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id, "boi");
    const cancelData = await book.findByIdAndUpdate(
      { _id: id },
      { $set: { status: "cancelled" } }
    );
    console.log(cancelData, "cancelD");
    return res.status(200).json({
      status: true,
      message: "cancelled",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: error.message });
  }
};
module.exports.bookingResorts = async (req, res) => {
  try {
    const staff = req.params.id;
    console.log(req.params.id, "staffffs");
    await resort
      .find({
        $and: [{ resortowner: staff }, { is_delete: false }, { verify: true }],
      })
      .then((response) => {
        res.json({
          status: true,
          message: "successs",
          resort: response,
        });
      });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports.bookingSingleResorts = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id, "idz");
    const bookedData = await book.find({ resortId: id });
    console.log(bookedData, "bD");
    res.json({
      status: true,
      message: "successfully done it",
      book: bookedData,
    });
  } catch (error) {
    console.log(error.message);
  }
};

