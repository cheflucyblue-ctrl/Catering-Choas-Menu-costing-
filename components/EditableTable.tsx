
import React, { useState } from 'react';

interface Column<T> {
  header: string;
  key: keyof T;
  render?: (val: any, item: T) => React.ReactNode;
  editable?: boolean;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  onUpdate: (id: string, key: keyof T, value: any) => void;
  onDelete?: (id: string) => void;
  idField: keyof T;
}

export function EditableTable<T extends { [key: string]: any }>({ data, columns, onUpdate, onDelete, idField }: Props<T>) {
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const startEdit = (id: string, key: string, currentVal: any) => {
    setEditing({ id, key });
    setTempValue(String(currentVal));
  };

  const saveEdit = () => {
    if (editing) {
      onUpdate(editing.id, editing.key as keyof T, tempValue);
      setEditing(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 text-gray-600 font-semibold text-sm uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4 border-b border-gray-100">{col.header}</th>
            ))}
            {onDelete && <th className="px-6 py-4 border-b border-gray-100 w-20 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
          {data.map((item) => (
            <tr key={item[idField as string]} className="hover:bg-gray-50 transition-colors">
              {columns.map((col, idx) => {
                const isEditing = editing?.id === item[idField as string] && editing?.key === col.key;
                return (
                  <td 
                    key={idx} 
                    className="px-6 py-4 cursor-pointer"
                    onDoubleClick={() => col.editable && startEdit(item[idField as string], col.key as string, item[col.key])}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none shadow-inner"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    ) : (
                      col.render ? col.render(item[col.key], item) : String(item[col.key])
                    )}
                  </td>
                );
              })}
              {onDelete && (
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onDelete(item[idField as string])}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                </td>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + (onDelete ? 1 : 0)} className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                No items available in master list
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
