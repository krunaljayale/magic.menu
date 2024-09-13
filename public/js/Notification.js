const checkPermission = ()=>{
    if(!("serviceWorker" in navigator)){
        throw new Error("No support for service worker")
    }
};

if(!("Notification" in window)){
    throw new Error("No support for notification API")
}

// const registerSW = async ()=>{
//     const registration = await navigator.serviceWorker.register("/js/ServiceWorker.js");
//     // console.log(registration)
//     return registration;
// }

const registerSW = async () => {
    // Unregister any existing Service Worker
    await navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  
    // Register the new Service Worker
    const registration = await navigator.serviceWorker.register("/js/ServiceWorker.js");
    return registration;
  };

const requestNotificationPermission = async() =>{
    const permission = await Notification.requestPermission();
    // console.log(permission)
    if(permission != "granted"){
        throw new Error("Notification permission not granted")
    }
}

let  main = async ()=>{
    checkPermission();
    await requestNotificationPermission();
    await registerSW();
}