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
    let layout='';
    function button(){
        const width=Math.min(320,Math.floor(slot.clientWidth));
        const locale=document.documentElement.lang;
        const next=width+':'+locale;
        if(!width||next===layout) return;
        layout=next;
        slot.replaceChildren();
        gis.renderButton(slot,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',logo_alignment:'center',width,locale});
    }
    button();
    new MutationObserver(button).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    new ResizeObserver(button).observe(slot);
}
if(document.readyState==='complete') renderGoogle();
else window.addEventListener('load',renderGoogle,{once:true});
