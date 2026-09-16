document.addEventListener("DOMContentLoaded",function(){
  const form=document.getElementById("contactForm"), status=document.getElementById("formStatus");
  if(form) form.addEventListener("submit",function(e){
    e.preventDefault();
    const name=document.getElementById("contactName"), email=document.getElementById("contactEmail"), subject=document.getElementById("contactSubject"), msg=document.getElementById("contactMessage");
    if(!name.value.trim()||!email.value.trim()||!subject.value||!msg.value.trim()){
      status.textContent="Please complete all required fields before sending your enquiry."; status.classList.add("show"); return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)){status.textContent="Please enter a valid email address.";status.classList.add("show");return;}
    status.textContent="Enquiry captured successfully in this demo interface. Connect the form to the approved departmental backend/email service for production.";status.classList.add("show"); form.reset();
  });
});