export const sendNotification = async (message: string) => {
  try {
    console.log("Notification:", message);

    // Later you can integrate real push notifications
    return true;
  } catch (error) {
    console.error("Notification error:", error);
    return false;
  }
};