import React from 'react'
import ResortManagements from"../../components/Staff/Resorts";
import Navbar from '../../components/navbar/StaffNavbar';
import Sidebar from"../../components/Sidebar/StaffSidebar";
function ResortManagement() {
  return (
    <div>
      <Navbar/>
      <div className="grid grid-cols-[1fr_7fr] sm:grid-cols-[1.5fr_8.5fr] w-full" >
      <Sidebar/>
      <ResortManagements/>
      </div>
     
    </div>
  )
}

export default ResortManagement



