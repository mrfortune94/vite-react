import React, { useRef } from "react";

const jsPDFUrl = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const jsZipUrl = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

export default function PayslipGenerator() {
  const formRef = useRef(null);

  React.useEffect(() => {
    // Dynamically load jsPDF and JSZip if not present
    if (!window.jspdf) {
      const script = document.createElement("script");
      script.src = jsPDFUrl;
      document.head.appendChild(script);
    }
    if (!window.JSZip) {
      const script = document.createElement("script");
      script.src = jsZipUrl;
      document.head.appendChild(script);
    }
  }, []);

  function calculateWeeklyPAYG(gross) {
    const annualised = gross * 52;
    let tax = 0;
    if (annualised <= 18200) tax = 0;
    else if (annualised <= 45000) tax = (annualised - 18200) * 0.19;
    else if (annualised <= 120000) tax = 5092 + (annualised - 45000) * 0.325;
    else if (annualised <= 180000) tax = 29467 + (annualised - 120000) * 0.37;
    else tax = 51667 + (annualised - 180000) * 0.45;
    return tax / 52;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const { jsPDF } = window.jspdf;
    const zip = new window.JSZip();

    const companyName = formRef.current.companyName.value;
    const abn = formRef.current.abn.value;
    const address = formRef.current.address.value;
    const superRate = parseFloat(formRef.current.superRate.value) / 100;

    const empName = formRef.current.empName.value;
    const empID = formRef.current.empID.value;
    const hourlyRate = parseFloat(formRef.current.hourlyRate.value);
    const hoursWorked = parseFloat(formRef.current.hoursWorked.value);
    const overtimeHours = parseFloat(formRef.current.overtimeHours.value);
    const overtimeRate = parseFloat(formRef.current.overtimeRate.value);

    let [annualLeave, sickLeave] = formRef.current.leaveBalances.value
      .split(",")
      .map(Number);

    let startDate = new Date(formRef.current.startDate.value);

    for (let week = 1; week <= 52; week++) {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const gross = hoursWorked * hourlyRate + overtimeHours * overtimeRate;
      const superAmount = gross * superRate;
      const payg = calculateWeeklyPAYG(gross);
      const netPay = gross - superAmount - payg;

      annualLeave += gross * 0.0154;
      sickLeave += (gross * 0.0385) / 12;

      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text(`EMPLOYEE PAYSLIP`, 20, 20);
      doc.text(`Company: ${companyName}`, 20, 30);
      doc.text(`ABN: ${abn}`, 20, 36);
      doc.text(`Address: ${address}`, 20, 42);
      doc.text(`Employee: ${empName} (ID: ${empID})`, 20, 54);
      doc.text(
        `Pay Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        20,
        60
      );
      doc.text(`Hours Worked: ${hoursWorked}`, 20, 72);
      doc.text(`Hourly Rate: $${hourlyRate.toFixed(2)}`, 20, 78);
      doc.text(
        `Overtime: ${overtimeHours} @ $${overtimeRate.toFixed(2)}`,
        20,
        84
      );
      doc.text(`Gross Pay: $${gross.toFixed(2)}`, 20, 96);
      doc.text(`PAYG: $${payg.toFixed(2)}`, 20, 102);
      doc.text(
        `Super (${(superRate * 100).toFixed(1)}%): $${superAmount.toFixed(2)}`,
        20,
        108
      );
      doc.text(`Net Pay: $${netPay.toFixed(2)}`, 20, 114);
      doc.text(
        `Annual Leave Balance: $${annualLeave.toFixed(2)}`,
        20,
        126
      );
      doc.text(
        `Sick Leave Balance: $${sickLeave.toFixed(2)}`,
        20,
        132
      );

      const pdfBlob = doc.output("blob");
      zip.file(`Payslip_Week${week}.pdf`, pdfBlob);

      startDate.setDate(startDate.getDate() + 7);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${empName}_Payslips_Year.zip`;
    a.click();
    URL.revokeObjectURL(url);

    alert("52 weekly payslips generated and downloaded as ZIP!");
  }

  return (
    <div>
      <h1>Weekly Payslip Generator (1 Year)</h1>
      <form ref={formRef} id="payslipForm" onSubmit={handleSubmit}>
        <h2>Company Details</h2>
        Company Name: <input type="text" name="companyName" required />
        <br />
        ABN: <input type="text" name="abn" required />
        <br />
        Address: <input type="text" name="address" required />
        <br />
        Super Rate (%): <input type="number" name="superRate" defaultValue="11" required />
        <br />
        <h2>Employee Details</h2>
        Employee Name: <input type="text" name="empName" required />
        <br />
        Employee ID: <input type="text" name="empID" required />
        <br />
        Hourly Rate ($): <input type="number" name="hourlyRate" step="0.01" required />
        <br />
        Weekly Hours: <input type="number" name="hoursWorked" step="0.1" required />
        <br />
        Overtime Hours: <input type="number" name="overtimeHours" defaultValue="0" step="0.1" />
        <br />
        Overtime Rate: <input type="number" name="overtimeRate" defaultValue="0" step="0.01" />
        <br />
        Leave Balances (Annual, Sick): <input type="text" name="leaveBalances" defaultValue="0,0" />
        <br />
        Pay Period Start Date (Tuesday): <input type="date" name="startDate" required />
        <br />
        <button type="submit">Generate Payslips</button>
      </form>
    </div>
  );
}