const SUBJECTS=[
"Java","C","C++","Data Structures & Algorithms","Python","JavaScript","HTML","CSS","SQL","DBMS",
"Operating Systems","Computer Networks","Computer Architecture","Software Engineering","OOP",
"Machine Learning","Artificial Intelligence","Deep Learning","Data Science","Cloud Computing",
"Cyber Security","Git & GitHub","React.js","Node.js","Express.js","Django","Flask","Spring Boot",
"MongoDB","MySQL","PostgreSQL","REST API","System Design","Linux","DevOps","Docker","Kubernetes",
"Power BI","Excel","Statistics","Discrete Mathematics","Compiler Design","Theory of Computation",
"Web Development","Mobile App Development","Natural Language Processing","Computer Vision",
"Generative AI","Prompt Engineering","Agile & Scrum","Testing & QA"
];

const BANK={
"Java":[
"What is Java and why is it platform independent?","Explain OOP concepts in Java.","What is the difference between JDK, JRE and JVM?",
"Explain method overloading and overriding.","What is exception handling in Java?","What is the difference between ArrayList and LinkedList?",
"Explain inheritance in Java.","What is an interface?","What is the difference between == and equals()?",
"What are Java access modifiers?"
],
"C":["What are pointers in C?","Explain arrays and strings in C.","What is a structure in C?","Explain malloc, calloc and free.",
"What is recursion?","What is the difference between call by value and pointer-based modification?","Explain storage classes.",
"What is a NULL pointer?","What is a function pointer?","What is the difference between struct and union?"],
"C++":["What is C++?","Explain classes and objects in C++.","What is inheritance?","Explain polymorphism.",
"What is a constructor and destructor?","What is function overloading?","What is operator overloading?",
"What is a virtual function?","What is STL?","Explain vector, map and set."],
"Data Structures & Algorithms":["What is a data structure?","Compare array and linked list.","Explain stack and queue.",
"What is a binary tree?","What is a binary search tree?","Explain BFS and DFS.","What is hashing?",
"What is Big-O notation?","Explain merge sort.","Explain binary search."]
};

let authMode="login", currentUser=null, resumeContent="", questions=[], qIndex=0, scores=[], recognition=null, stream=null;

const $=id=>document.getElementById(id);
const navButtons=[...document.querySelectorAll("[data-page]")];
navButtons.forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));

function showPage(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 $(id).classList.add("active");
 if(id==="subjects")renderSubjects();
}
function getUsers(){return JSON.parse(localStorage.getItem("mockUsers")||"[]");}
function saveUsers(users){localStorage.setItem("mockUsers",JSON.stringify(users));}
function init(){
 const saved=localStorage.getItem("mockCurrentUser");
 if(saved){currentUser=JSON.parse(saved);openApp();}
 renderSubjects();
 SUBJECTS.forEach(s=>$('subjectSelect').add(new Option(s,s)));
}
function openApp(){
 $("authPage").classList.add("hidden");$("app").classList.remove("hidden");
 $("welcomeName").textContent=currentUser.name||currentUser.email;
}
function showAuthMessage(msg,ok=false){
 $("authNote").textContent=msg;
 $("authNote").className=ok?"success-note":"error-note";
}
$("switchAuth").onclick=()=>{
 authMode=authMode==="login"?"signup":"login";
 $("authTitle").textContent=authMode==="login"?"Welcome Back":"Create Account";
 $("authSub").textContent=authMode==="login"?"Login with your registered account.":"Create a new account to practice interviews.";
 $("authBtn").textContent=authMode==="login"?"Login":"Sign Up";
 $("switchAuth").innerHTML=authMode==="login"?"New user? <b>Create account</b>":"Already have an account? <b>Login</b>";
 $("signupFields").classList.toggle("hidden",authMode!=="signup");
 $("authPassword").setAttribute("autocomplete",authMode==="login"?"current-password":"new-password");
 showAuthMessage(authMode==="login"?"Enter the email and password you registered with.":"Use a valid email and a password with at least 6 characters.");
};
$("authBtn").onclick=()=>{
 const email=$("authEmail").value.trim().toLowerCase(), pass=$("authPassword").value;
 if(!/^\S+@\S+\.\S+$/.test(email)){showAuthMessage("Enter a valid email address.");return;}
 if(pass.length<6){showAuthMessage("Password must be at least 6 characters.");return;}
 const users=getUsers();
 if(authMode==="signup"){
   const name=$("signupName").value.trim(), confirm=$("signupConfirm").value;
   if(name.length<2){showAuthMessage("Enter your full name.");return;}
   if(pass!==confirm){showAuthMessage("Passwords do not match.");return;}
   if(users.some(u=>u.email===email)){showAuthMessage("This email is already registered. Please login.");return;}
   currentUser={id:Date.now(),name,email,password:pass};
   users.push(currentUser);saveUsers(users);localStorage.setItem("mockCurrentUser",JSON.stringify(currentUser));
   showAuthMessage("Account created successfully. Opening dashboard...",true);openApp();
 }else{
   const user=users.find(u=>u.email===email && u.password===pass);
   if(!user){showAuthMessage("Invalid email or password. If you are new, create an account first.");return;}
   currentUser=user;localStorage.setItem("mockCurrentUser",JSON.stringify(user));openApp();
 }
};
$("logoutBtn").onclick=()=>{
 currentUser=null;localStorage.removeItem("mockCurrentUser");
 if(stream)stream.getTracks().forEach(t=>t.stop());
 $("app").classList.add("hidden");$("authPage").classList.remove("hidden");
 $("authEmail").value="";$("authPassword").value="";
};

function renderSubjects(){
 $("subjectGrid").innerHTML=SUBJECTS.map((s,i)=>`<div class="subject" data-s="${i}">${i+1}. ${s}</div>`).join("");
 document.querySelectorAll(".subject").forEach(x=>x.onclick=()=>{
   $("subjectSelect").value=x.dataset.s?SUBJECTS[x.dataset.s]:x.textContent.split(". ").slice(1).join(". ");
   showPage("interview");
 });
}

$("resumeFile").onchange=async e=>{
 const file=e.target.files[0]; if(!file)return;
 $("resumeStatus").textContent=`Selected: ${file.name}`;
 if(file.type==="text/plain"||file.name.toLowerCase().endsWith(".txt")){
   resumeContent=await file.text();$("resumeText").value=resumeContent;
 }else{
   $("resumeStatus").textContent=`${file.name} selected. For offline demo, paste the resume text into the box below for accurate resume-based questions.`;
 }
};
$("prepareBtn").onclick=prepareInterview;

function prepareInterview(){
 resumeContent=$("resumeText").value.trim();
 const subject=$("subjectSelect").value, count=Number($("questionCount").value);
 questions=makeQuestions(subject,count,resumeContent);
 qIndex=0;scores=[];$("resultPanel").classList.add("hidden");$("interviewRoom").classList.remove("hidden");
 startCamera();showQuestion();
}

function makeQuestions(subject,count,resume){
 let bank=BANK[subject]||genericQuestions(subject);
 let out=[];
 const text=resume.toLowerCase();
 const tech=SUBJECTS.filter(s=>text.includes(s.toLowerCase()));
 if(resume){
   const words=[...new Set((resume.match(/[A-Za-z][A-Za-z0-9+#.-]{2,}/g)||[]).filter(w=>w.length>3))].slice(0,30);
   if(words.length) out.push(`Your resume mentions "${words.slice(0,5).join(", ")}". Can you explain your experience with these skills?`);
   if(tech.length) out.push(`Your resume mentions ${tech.slice(0,5).join(", ")}. Which of these are you strongest in, and why?`);
   out.push("Walk me through one project from your resume. What was your role and what did you build?");
   out.push("What was the biggest challenge you faced in a project mentioned on your resume, and how did you solve it?");
 }
 bank=[...out,...bank];
 while(out.length<count) out.push(bank[out.length%bank.length]);
 return out.slice(0,count);
}
function genericQuestions(subject){
 return [
 `What is ${subject} and why is it important?`,
 `Explain the core concepts of ${subject} with a simple example.`,
 `What are common interview questions in ${subject}?`,
 `Describe one project where you could use ${subject}.`,
 `What are the advantages and limitations of ${subject}?`,
 `How would you debug or solve a problem in ${subject}?`,
 `Compare two important concepts in ${subject}.`,
 `What should a fresher learn first in ${subject}?`
 ];
}

function showQuestion(){
 $("progress").textContent=`Question ${qIndex+1}/${questions.length}`;
 $("liveQuestion").textContent=questions[qIndex];
 $("spokenAnswer").textContent="Typing or speaking answer will appear here.";
 $("answerText").value="";
 $("aiStatus").textContent="AI is ready. Click Speak Answer and talk.";
 speak(questions[qIndex]);
}
function speak(text){
 if("speechSynthesis" in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.rate=.95;speechSynthesis.speak(u)}
}
async function startCamera(){
 const video=$("camera");
 if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
  $("aiStatus").textContent="Camera needs HTTPS or localhost. Open the project using Chrome on https:// or localhost.";
  return;
 }
 try{
  // Request camera separately so microphone/voice permission cannot block the camera.
  const cam=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
  stream=cam;
  video.srcObject=cam;
  video.onloadedmetadata=()=>video.play().catch(()=>{});
  $("aiStatus").textContent="📷 Camera is ON. You can type or speak your answer.";
 }catch(err){
  console.error("Camera error:",err);
  let msg="Camera could not be opened. Allow Camera permission and try again.";
  if(location.protocol!=="https:" && location.hostname!=="localhost") msg="Camera requires HTTPS or localhost. Open the deployed HTTPS site or run on localhost.";
  $("aiStatus").textContent="⚠️ "+msg;
 }
}
function startRecognition(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){alert("Speech recognition is not supported in this browser. Use Chrome on Android/desktop.");return}
 recognition=new SR();recognition.lang="en-IN";recognition.interimResults=true;recognition.continuous=false;
 let final="";
 recognition.onstart=()=>{$("aiStatus").textContent="🎙️ Listening... Speak your answer."};
 recognition.onresult=e=>{final=[...e.results].map(r=>r[0].transcript).join(" ");$("answerText").value=final;$("spokenAnswer").textContent=final};
 recognition.onerror=()=>{$("aiStatus").textContent="Could not hear clearly. Try again."};
 recognition.onend=()=>{$("aiStatus").textContent="Answer captured. Click Next Question."};
 recognition.start();
}
$("speakBtn").onclick=startRecognition;
$("typeBtn").onclick=()=>{$("answerText").focus();$("aiStatus").textContent="⌨️ Typing mode. Type your answer below."};
$("stopSpeakBtn").onclick=()=>recognition?.stop();
$("nextBtn").onclick=()=>{
 const ans=$("answerText").value.trim();
 scores.push(evaluate(ans));
 if(qIndex<questions.length-1){qIndex++;showQuestion()}else finish();
};
function evaluate(ans){
 const n=ans.length;
 if(n<20)return 25;
 if(n<60)return 55;
 if(n<120)return 75;
 return 90;
}
function finish(){
 if(stream)stream.getTracks().forEach(t=>t.stop());
 const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
 $("finalScore").textContent=avg+"%";
 $("performanceText").textContent=avg>=80?"Excellent Performance!":avg>=60?"Good Performance!":"Needs More Practice";
 $("feedbackText").textContent=avg>=80?"Strong communication and detailed answers.":avg>=60?"Good foundation. Add examples and technical details.":"Practice answering with a clear structure: concept → example → result.";
 $("resultList").innerHTML=scores.map((s,i)=>`<div class="result-row"><b>Question ${i+1}</b><br><span class="${s>=60?"good":"bad"}">Score: ${s}%</span></div>`).join("");
 $("resultPanel").classList.remove("hidden");
 $("resultPanel").scrollIntoView({behavior:"smooth"});
}
$("newInterview").onclick=()=>{$("resultPanel").classList.add("hidden");$("interviewRoom").classList.add("hidden");window.scrollTo(0,0)};

init();
