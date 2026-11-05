export const $=(s,root=document)=>root.querySelector(s);
export const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bdi=(s='')=>'<bdi>'+esc(s)+'</bdi>';
export const csrf=document.body.dataset.csrf;
export const appUrl=path=>new URL('../'+path,import.meta.url).pathname;
export async function request(url,options={}){
    const response=await fetch(url,{cache:'no-store',...options});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||'The request failed.');
    return data;
}
export function post(data){
    const form=data instanceof FormData;
    const headers={'X-CSRF-Token':csrf};
    if(!form) headers['Content-Type']='application/json';
    return request(appUrl('api.php'),{method:'POST',headers,body:form?data:JSON.stringify(data)});
}
const shapes={
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2ZM16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2h-4"/>',
    person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 7 0 0 1 16 0v2Z"/>',
    box:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5m-9 5v10"/>',
    gift:'<rect x="4" y="9" width="16" height="13" rx="1"/><rect x="2" y="6" width="20" height="5" rx="1"/><path d="M12 7v15m0-15S5 8 6 3c1-3 5-1 6 4Zm0 0s7 1 6-4c-1-3-5-1-6 4Z"/>',
    stack:'<path d="m12 2 10 5-10 5L2 7Zm10 10-10 5-10-5m20 5-10 5-10-5"/>',
    crown:'<path d="m3 5 5 5 4-6 4 6 5-5-2 12H5Zm3 15h12"/>'
};
export function icon(name){return '<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shapes[name]+'</svg>'}
export function avatar(p,version){
    const initial=p.name.trim().split(/\s+/u).slice(0,2).map(s=>Array.from(s)[0]).join('').toUpperCase();
    return '<span class="avatar" aria-hidden="true">'+(p.photo?'<img alt="" src="'+esc(appUrl('avatar.php'))+'?id='+p.id+'&amp;v='+version+'">':esc(initial))+'</span>';
}
