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
    const response = await fetch('https://magic-menu.onrender.com/service', {
        method:'post',
        headers:{'Content-type':"application/json"},
        body: JSON.stringify(subscription)
    })
    
    return response.json();
}

self.addEventListener("activate",async (e)=> {
    const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey :urlBase64ToUint8Array('BMZCa-abHsQbxoO6k8M1hucKVk4vTU3UzOHJBh34gABfKjpvay3j2_xhxADWUZiNHH3YTfvBtDLJn64yGYbLAA4')
    });
    await saveSubscription(subscription);
});


self.addEventListener("push", e=>{     
    self.registration.showNotification("Notification", {body: e.data.text()})
})
