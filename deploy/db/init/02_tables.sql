BEGIN;

CREATE TYPE dc_new.user_role AS ENUM ('teacher', 'student');
CREATE TYPE dc_new.offer_status AS ENUM ('open', 'closed', 'archived');
CREATE TYPE dc_new.payment_type AS ENUM ('money', 'credits');
CREATE TYPE dc_new.booking_status AS ENUM ('pending', 'active', 'cancelled');

CREATE TABLE dc_new.users (
    id            bigserial PRIMARY KEY,
    email         varchar(255) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name    varchar(100) NOT NULL,
    last_name     varchar(100) NOT NULL,
    middle_name   varchar(100),
    role          dc_new.user_role NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.student_profiles (
    user_id                  bigint PRIMARY KEY REFERENCES dc_new.users(id) ON DELETE CASCADE,
    birthday                 date,
    citizenship              varchar(100),
    phone                    varchar(50),
    telegram                 varchar(100),
    study_year               int,
    edu_faculty              varchar(255),
    edu_program              varchar(255),
    debts                    text,
    edu_rating               varchar(50),
    digital_literacy_score   varchar(50),
    python_score             varchar(50),
    data_analysis_score      varchar(50),
    motivation_text          text,
    achievements             text,
    prior_courses            text,
    experience               text,
    recommendation_available boolean NOT NULL DEFAULT false,
    recommendation_email     text,
    questionnaire_completed  boolean NOT NULL DEFAULT false,
    created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.faculties (
    id         bigserial PRIMARY KEY,
    name       varchar(255) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.programs (
    id         bigserial PRIMARY KEY,
    faculty_id bigint NOT NULL REFERENCES dc_new.faculties(id) ON DELETE RESTRICT,
    name       varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (faculty_id, name)
);

CREATE TABLE dc_new.disciplines (
    id         bigserial PRIMARY KEY,
    name       varchar(255) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.modules (
    id         bigserial PRIMARY KEY,
    number     int NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.course_offers (
    id            bigserial PRIMARY KEY,
    teacher_id    bigint NOT NULL REFERENCES dc_new.users(id) ON DELETE RESTRICT,
    program_id    bigint NOT NULL REFERENCES dc_new.programs(id) ON DELETE RESTRICT,
    discipline_id bigint NOT NULL REFERENCES dc_new.disciplines(id) ON DELETE RESTRICT,
    total_groups  int NOT NULL CHECK (total_groups > 0),
    status        dc_new.offer_status NOT NULL DEFAULT 'open',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.course_offer_modules (
    offer_id  bigint NOT NULL REFERENCES dc_new.course_offers(id) ON DELETE CASCADE,
    module_id bigint NOT NULL REFERENCES dc_new.modules(id) ON DELETE RESTRICT,
    PRIMARY KEY (offer_id, module_id)
);

CREATE TABLE dc_new.course_offer_links (
    id         bigserial PRIMARY KEY,
    offer_id   bigint NOT NULL REFERENCES dc_new.course_offers(id) ON DELETE CASCADE,
    name       varchar(200) NOT NULL,
    url        text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dc_new.bookings (
    id                    bigserial PRIMARY KEY,
    offer_id              bigint NOT NULL REFERENCES dc_new.course_offers(id) ON DELETE RESTRICT,
    student_id            bigint NOT NULL REFERENCES dc_new.users(id) ON DELETE RESTRICT,
    payment_type          dc_new.payment_type NOT NULL,
    num_groups            int NOT NULL DEFAULT 1 CHECK (num_groups BETWEEN 1 AND 4),
    status                dc_new.booking_status NOT NULL DEFAULT 'active',
    created_by_teacher_id bigint NOT NULL REFERENCES dc_new.users(id) ON DELETE RESTRICT,
    created_at            timestamptz NOT NULL DEFAULT now(),
    cancelled_at          timestamptz,
    cancelled_by_user_id  bigint REFERENCES dc_new.users(id) ON DELETE RESTRICT,
    UNIQUE (offer_id, student_id)
);

CREATE TABLE dc_new.student_preferences (
    id                 bigserial PRIMARY KEY,
    student_id         bigint NOT NULL REFERENCES dc_new.users(id) ON DELETE CASCADE,
    discipline_id      bigint NOT NULL REFERENCES dc_new.disciplines(id) ON DELETE CASCADE,
    priority           int NOT NULL CHECK (priority > 0),
    desired_group_size int,
    created_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, priority),
    UNIQUE (student_id, discipline_id)
);

CREATE INDEX idx_dc_new_users_role
    ON dc_new.users(role);

CREATE INDEX idx_dc_new_programs_faculty_id
    ON dc_new.programs(faculty_id);

CREATE INDEX idx_dc_new_course_offers_teacher_id
    ON dc_new.course_offers(teacher_id);

CREATE INDEX idx_dc_new_course_offers_program_id
    ON dc_new.course_offers(program_id);

CREATE INDEX idx_dc_new_course_offers_discipline_id
    ON dc_new.course_offers(discipline_id);

CREATE INDEX idx_dc_new_course_offer_links_offer_id
    ON dc_new.course_offer_links(offer_id);

CREATE INDEX idx_dc_new_bookings_offer_id
    ON dc_new.bookings(offer_id);

CREATE INDEX idx_dc_new_bookings_student_id
    ON dc_new.bookings(student_id);

CREATE INDEX idx_dc_new_student_preferences_student_id
    ON dc_new.student_preferences(student_id);

COMMIT;