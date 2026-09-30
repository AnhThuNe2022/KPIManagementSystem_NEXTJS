"use client";

import {
    getAssignmentTypeText,
  UserOrganizationDto
} from "@/types/organization";

interface Props {
  assignments: UserOrganizationDto[];

  onEdit: (
    item: UserOrganizationDto
  ) => void;

  onDelete: (
    item: UserOrganizationDto
  ) => void;
}

export default function AssignmentTable({
  assignments,
  onEdit,
  onDelete
}: Props) {

  const visible =
    assignments.filter(
      x => !x.isDeleted
    );

  return (
    <div className="overflow-x-auto">

      <table className="w-full text-sm">

        <thead>
          <tr className="border-b text-left">

            <th className="p-3">
              Loại
            </th>

            <th className="p-3">
              Mã NV
            </th>

            <th className="p-3">
              Công ty
            </th>

            <th className="p-3">
              Phòng ban
            </th>

            <th className="p-3">
              Chức danh
            </th>

            <th className="p-3">
              Quản lý
            </th>

            <th className="p-3" />

          </tr>
        </thead>

        <tbody>

          {visible.map(item => (

            <tr
              key={item.id ?? crypto.randomUUID()}
              className="border-b"
            >

              <td className="p-3">
                {getAssignmentTypeText(
                  item.assignmentType
                )}
              </td>

              <td className="p-3">
                {item.employeeCode}
              </td>

              <td className="p-3">
                {item.companyName}
              </td>

              <td className="p-3">
                {item.departmentName}
              </td>

              <td className="p-3">
                {item.jobTitle}
              </td>

              <td className="p-3">
                {item.managerName}
                {" - "}
                {item.managerJobTitle}
                {" - "}
                {item.managerDepartmentName}
                {" - "}
                {item.managerCompanyName}
              </td>

              <td className="p-3 text-right">

                <button
                  onClick={() => onEdit(item)}
                  className="mr-2"
                >
                  Sửa
                </button>

                <button
                  onClick={() => onDelete(item)}
                  className="text-red-600"
                >
                  Xóa
                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}