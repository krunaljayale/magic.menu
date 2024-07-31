const urlBase64ToUint8Array = base64String =>{
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i= 0; i < rawData.length; ++i){
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const saveSubscription = async (subscription) =>{
    const response = await fetch('https://magicmenu.in/subscribe', {
        method:'post',
        headers:{'Content-type':"application/json"},
        body: JSON.stringify(subscription)
    })
    return response.json();
}

self.addEventListener("activate",async (e)=> {
    const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey :urlBase64ToUint8Array('BHq_8RoraWdxr9KCj1h_b2fN-FiTOBQ5fCQqupnmA7Y1H07qybrjLYEAfPyHW5xs1ZIQ1aL5XPRClxVtlLWTcdI')
    });
    await saveSubscription(subscription);
});


self.addEventListener("push", e=>{     
    self.registration.showNotification("Notification", {body: e.data.text()})
});