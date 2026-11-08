const slot=document.querySelector('#google-button');
const form=document.querySelector('#google-form');
function renderGoogle(){
    const gis=window.google?.accounts?.id;
    if(!gis){
        document.querySelector('#google-status').textContent='Google sign-in is unavailable. You can still use email.';
        return;
    }
    gis.initialize({
        client_id:slot.dataset.client,
        nonce:slot.dataset.nonce,
        ux_mode:'popup',
        callback({credential}){
            form.elements.credential.value=credential;
            form.requestSubmit();
        }
    });
    gis.renderButton(slot,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',locale:document.documentElement.lang});
}
if(document.readyState==='complete') renderGoogle();
else window.addEventListener('load',renderGoogle,{once:true});
