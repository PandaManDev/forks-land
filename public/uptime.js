(() => {

"use strict";

const API = "/api/uptime";

const GUILD_ID =
"1544159911875707003";

const INVITE =
"https://dc.gg/fork-lands";


let baseUptime = 0;

let lastSync = Date.now();

let isOnline = false;

let refreshTimer = null;

let refreshEvery = 30000;

let autoRefresh = true;

const history = [];

const MAX_HISTORY = 30;


const $ = id =>
document.getElementById(id);


function pad(number){

return String(number)
.padStart(2,"0");

}


function renderTimer(seconds){

seconds =
Math.max(
0,
Number(seconds) || 0
);


const days =
Math.floor(
seconds / 86400
);


const hours =
Math.floor(
(seconds % 86400) / 3600
);


const minutes =
Math.floor(
(seconds % 3600) / 60
);


const secs =
Math.floor(
seconds % 60
);


$("d").textContent =
pad(days);

$("h").textContent =
pad(hours);

$("m").textContent =
pad(minutes);

$("s").textContent =
pad(secs);

}


function toast(message){

const element =
$("toast");

element.textContent =
message;

element.classList.add("show");

clearTimeout(
toast.timer
);

toast.timer =
setTimeout(
() => {

element.classList.remove(
"show"
);

},
2200
);

}


async function copyText(
text,
message
){

try{

await navigator.clipboard
.writeText(text);

toast(
message || "Copied!"
);

}

catch{

toast(
"Copy failed."
);

}

}


function indicator(
id,
state
){

const element =
$(id);

element.className =
"status-indicator";

if(state === "warn"){

element.classList.add(
"warn"
);

}

if(state === "bad"){

element.classList.add(
"bad"
);

}

}


function setStatus(
status
){

const statusText =
$("status-text");


if(status === "online"){

isOnline = true;

statusText.className =
"health online";

statusText.innerHTML =
"<strong>Online</strong>";

$("heroStatus").textContent =
"All systems operational";

$("serverLive").textContent =
"Online";

$("offline-banner")
.style.display =
"none";

indicator(
"discordIndicator",
"good"
);

$("discordHealth")
.textContent =
"Operational";

indicator(
"apiIndicator",
"good"
);

$("apiHealth")
.textContent =
"Operational";

}

else if(
status === "reconnecting"
){

isOnline = false;

statusText.className =
"health reconnecting";

statusText.innerHTML =
"<strong>Reconnecting…</strong>";

$("heroStatus").textContent =
"Reconnecting…";

$("serverLive").textContent =
"Reconnecting…";

$("offline-banner")
.style.display =
"block";

indicator(
"discordIndicator",
"warn"
);

$("discordHealth")
.textContent =
"Retrying";

indicator(
"apiIndicator",
"warn"
);

$("apiHealth")
.textContent =
"Retrying";

}

else{

isOnline = false;

statusText.className =
"health offline";

statusText.innerHTML =
"<strong>Offline</strong>";

$("heroStatus").textContent =
"Offline";

$("serverLive").textContent =
"Offline";

$("offline-banner")
.style.display =
"block";

indicator(
"discordIndicator",
"bad"
);

$("discordHealth")
.textContent =
"Unavailable";

indicator(
"apiIndicator",
"bad"
);

$("apiHealth")
.textContent =
"Unavailable";

}

}


function escapeHtml(value){

return String(
value ?? ""
)
.replace(
/[&<>"']/g,
character => {

const map = {

"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#039;"

};

return map[character];

}
);

}


function renderMembers(
users
){

const list =
$("memberList");


if(
!Array.isArray(users) ||
users.length === 0
){

list.innerHTML =

`<div class="muted">
No online members are currently exposed by the Discord widget.
</div>`;

return;

}


list.innerHTML =
users
.slice(0,12)
.map(
user => {

const name =
user.username ||
user.nick ||
"Discord user";


const avatar =
user.avatar_url ||
"logo.webp";


return `

<div class="member-row">

<img
class="avatar"
src="${escapeHtml(avatar)}"
alt=""
>

<div>

<div class="member-name">
${escapeHtml(name)}
</div>

<div class="member-tag">
Online
</div>

</div>

<span class="online-dot"></span>

</div>

`;

}
)
.join("");

}


function drawChart(){

const canvas =
$("activityChart");


const context =
canvas.getContext("2d");


const rectangle =
canvas.getBoundingClientRect();


const dpr =
window.devicePixelRatio || 1;


canvas.width =
Math.max(
300,
rectangle.width * dpr
);


canvas.height =
180 * dpr;


context.setTransform(
dpr,
0,
0,
dpr,
0,
0
);


const width =
rectangle.width;


const height =
180;


context.clearRect(
0,
0,
width,
height
);


context.strokeStyle =
getComputedStyle(
document.documentElement
)
.getPropertyValue(
"--border"
);


for(
let i = 1;
i < 4;
i++
){

const y =
20 + i * 40;

context.beginPath();

context.moveTo(
0,
y
);

context.lineTo(
width,
y
);

context.stroke();

}


if(
history.length < 2
){

return;

}


const maxOnline =
Math.max(
1,
...history.map(
item => item.online
)
);


const maxLatency =
Math.max(
1,
...history.map(
item => item.latency
)
);


const step =
width /
Math.max(
1,
history.length - 1
);


context.lineWidth = 2;


context.strokeStyle =
getComputedStyle(
document.documentElement
)
.getPropertyValue(
"--purple"
);


context.beginPath();


history.forEach(
(point,index) => {

const x =
index * step;


const y =
height -
20 -
(
point.online /
maxOnline
) *
(
height - 50
);


if(index === 0){

context.moveTo(
x,
y
);

}

else{

context.lineTo(
x,
y
);

}

}
);


context.stroke();


context.strokeStyle =
getComputedStyle(
document.documentElement
)
.getPropertyValue(
"--green"
);


context.beginPath();


history.forEach(
(point,index) => {

const x =
index * step;


const y =
height -
20 -
(
point.latency /
maxLatency
) *
(
height - 50
);


if(index === 0){

context.moveTo(
x,
y
);

}

else{

context.lineTo(
x,
y
);

}

}
);


context.stroke();

}


async function refresh(){

const started =
performance.now();


try{

const controller =
new AbortController();


const timeout =
setTimeout(
() =>
controller.abort(),
10000
);


const response =
await fetch(
`${API}?t=${Date.now()}`,
{

method:"GET",

cache:"no-store",

headers:{
"Accept":
"application/json"
},

signal:
controller.signal

}
);


clearTimeout(
timeout
);


if(
!response.ok
){

throw new Error(
`HTTP ${response.status}`
);

}


const data =
await response.json();


const latency =
Math.round(
performance.now() -
started
);


if(
!data.online
){

throw new Error(
"Status API reports offline"
);

}


setStatus(
"online"
);


baseUptime =
Number(
data.uptimeSeconds
) || 0;


lastSync =
Date.now();


renderTimer(
baseUptime
);


$("serverName")
.textContent =
data.serverName ||
"Forks Land";


$("infoServer")
.textContent =
data.serverName ||
"Forks Land";


const memberCount =
Number(
data.memberCount
);


const onlineMembers =
Number(
data.onlineMembers
);


$("memberCount")
.textContent =
Number.isFinite(
memberCount
)
?
memberCount.toLocaleString()
:
"—";


$("onlineCount")
.textContent =
Number.isFinite(
onlineMembers
)
?
onlineMembers.toLocaleString()
:
"—";


$("latency")
.textContent =
latency + " ms";


$("last-checked")
.textContent =
"just now";


$("infoOnline")
.textContent =
Number.isFinite(
onlineMembers
)
?
onlineMembers.toLocaleString()
:
"—";


$("infoChecked")
.textContent =
new Date()
.toLocaleTimeString();


$("discordMeta")
.textContent =
`Discord response received in ${latency} ms.`;


$("apiMeta")
.textContent =
`Status endpoint responded in ${latency} ms.`;


$("monitorMeta")
.textContent =
`Next check in ${Math.round(refreshEvery / 1000)} seconds.`;


if(
data.startedAt
){

const date =
new Date(
data.startedAt
);


if(
!isNaN(
date.getTime()
)
){

$("since").textContent =
"Monitoring since " +
date.toLocaleString(
undefined,
{

month:"short",

day:"numeric",

year:"numeric",

hour:"2-digit",

minute:"2-digit"

}
);

}

}


if(
data.icon
){

$("serverIcon").src =
data.icon;

}


renderMembers(
data.users || []
);


history.push({

online:
Number.isFinite(
onlineMembers
)
?
onlineMembers
:
0,

latency

});


while(
history.length >
MAX_HISTORY
){

history.shift();

}


drawChart();

}

catch(error){

console.error(
"Forks Land Status:",
error
);


setStatus(
isOnline
?
"reconnecting"
:
"offline"
);


$("last-checked")
.textContent =
"retrying…";


$("apiMeta")
.textContent =
"Status endpoint could not be reached.";

$("discordMeta")
.textContent =
"Discord data could not be retrieved.";

}


schedule();

}


function schedule(){

clearTimeout(
refreshTimer
);


if(
autoRefresh
){

refreshTimer =
setTimeout(
refresh,
refreshEvery
);

}

}


function tick(){

if(!isOnline){

return;

}


const current =
baseUptime +
(
Date.now() -
lastSync
) /
1000;


renderTimer(
current
);


const secondsAgo =
Math.max(
1,
Math.round(
(
Date.now() -
lastSync
) /
1000
)
);


$("last-checked")
.textContent =
secondsAgo + "s ago";

}


function applyTheme(
theme
){

document.documentElement
.dataset.theme =
theme;


$("themeBtn").textContent =
theme === "dark"
?
"☾"
:
"☀";


$("settingsTheme").value =
theme;


localStorage.setItem(
"forksLandTheme",
theme
);


setTimeout(
drawChart,
50
);

}


function loadSettings(){

let settings = {};

try{

settings =
JSON.parse(
localStorage.getItem(
"forksLandSettings"
) || "{}"
);

}

catch{

settings = {};

}


const savedTheme =
localStorage.getItem(
"forksLandTheme"
);


const theme =
settings.theme ||
savedTheme ||
"dark";


autoRefresh =
settings.auto !== false;


refreshEvery =
(
Number(
settings.interval
) || 30
) *
1000;


$("autoRefresh")
.checked =
autoRefresh;


$("refreshInterval")
.value =
String(
refreshEvery / 1000
);


$("compactMode")
.checked =
!!settings.compact;


applyTheme(
theme
);


$("infoRefresh")
.textContent =
Math.round(
refreshEvery / 1000
) +
" seconds";

}


function saveSettings(){

const theme =
$("settingsTheme").value;


autoRefresh =
$("autoRefresh").checked;


refreshEvery =
Number(
$("refreshInterval").value
) *
1000;


const compact =
$("compactMode").checked;


localStorage.setItem(
"forksLandSettings",
JSON.stringify({

theme,
auto:autoRefresh,
interval:
refreshEvery / 1000,
compact

})
);


applyTheme(
theme
);


document.body.style.setProperty(
"--radius",
compact
?
"15px"
:
"22px"
);


$("infoRefresh")
.textContent =
Math.round(
refreshEvery / 1000
) +
" seconds";


$("settingsModal")
.classList.remove(
"show"
);


toast(
"Settings saved"
);


schedule();

}


/* BUTTONS */

$("refreshBtn").onclick =
refresh;


$("refreshBtn2").onclick =
refresh;


$("themeBtn").onclick =
() => {

applyTheme(

(
document.documentElement
.dataset.theme ||
"dark"
)
===
"dark"
?
"light"
:
"dark"

);

};


$("settingsBtn").onclick =
() => {

$("settingsModal")
.classList.add(
"show"
);

};


$("closeSettings").onclick =
() => {

$("settingsModal")
.classList.remove(
"show"
);

};


$("settingsModal").onclick =
event => {

if(
event.target ===
$("settingsModal")
){

$("settingsModal")
.classList.remove(
"show"
);

}

};


$("saveSettings").onclick =
saveSettings;


$("resetSettings").onclick =
() => {

localStorage.removeItem(
"forksLandSettings"
);

localStorage.removeItem(
"forksLandTheme"
);

loadSettings();

toast(
"Settings reset"
);

};


$("copyInvite").onclick =
() =>
copyText(
INVITE,
"Discord invite copied!"
);


$("copyGuildId").onclick =
() =>
copyText(
GUILD_ID,
"Server ID copied!"
);


$("scrollStatus").onclick =
() =>
$("status")
.scrollIntoView({
behavior:"smooth"
});


window.addEventListener(
"resize",
drawChart
);


/* START */

setInterval(
tick,
1000
);


loadSettings();

refresh();

})();
