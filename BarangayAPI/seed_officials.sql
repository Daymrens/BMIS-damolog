-- Barangay Damolog, Sogod Cebu — Official Barangay Council Seed Data
-- Source: Sangguniang Barangay, Municipality of Sogod

DELETE FROM Officials;

INSERT INTO Officials (Name, Position, ContactNumber, TermStart, TermEnd, IsActive) VALUES
('Madera, Vivian M.',    'Punong Barangay',   '09171000001', '2023-01-01', '2025-12-31', 1),
('Monisit, Gaspar P.',   'Barangay Kagawad',  '09171000002', '2023-01-01', '2025-12-31', 1),
('Arnejo, Neil A.',      'Barangay Kagawad',  '09171000003', '2023-01-01', '2025-12-31', 1),
('Monisit, Mario P.',    'Barangay Kagawad',  '09171000004', '2023-01-01', '2025-12-31', 1),
('Coloscos, Analiza C.', 'Barangay Kagawad',  '09171000005', '2023-01-01', '2025-12-31', 1),
('Remidio, Jerome P.',   'Barangay Kagawad',  '09171000006', '2023-01-01', '2025-12-31', 1),
('Ruiz, Raymundo M.',    'Barangay Kagawad',  '09171000007', '2023-01-01', '2025-12-31', 1),
('Diocampo, Jeralin B.', 'Barangay Kagawad',  '09171000008', '2023-01-01', '2025-12-31', 1),
('Monteron, Pio L.',     'Barangay Secretary','09171000009', '2023-01-01', '2025-12-31', 1),
('Olaybar, Renato',      'Barangay Treasurer','09171000010', '2023-01-01', '2025-12-31', 1);
