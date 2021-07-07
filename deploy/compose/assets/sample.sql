--
-- PostgreSQL database cluster dump
--

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--


--
-- Databases
--

--
-- Database "sample" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 10.17 (Debian 10.17-1.pgdg90+1)
-- Dumped by pg_dump version 13.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: sample; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE sample WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_US.utf8';


ALTER DATABASE sample OWNER TO postgres;

\connect sample

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

--
-- Name: iris_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.iris_data (
    sepal_length double precision,
    sepal_width double precision,
    petal_length double precision,
    petal_width double precision,
    variety character varying
);


ALTER TABLE public.iris_data OWNER TO postgres;

--
-- Data for Name: iris_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.iris_data (sepal_length, sepal_width, petal_length, petal_width, variety) FROM stdin;
5.09999999999999964	3.5	1.39999999999999991	0.200000000000000011	Setosa
4.90000000000000036	3	1.39999999999999991	0.200000000000000011	Setosa
4.70000000000000018	3.20000000000000018	1.30000000000000004	0.200000000000000011	Setosa
4.59999999999999964	3.10000000000000009	1.5	0.200000000000000011	Setosa
5	3.60000000000000009	1.39999999999999991	0.200000000000000011	Setosa
5.40000000000000036	3.89999999999999991	1.69999999999999996	0.400000000000000022	Setosa
4.59999999999999964	3.39999999999999991	1.39999999999999991	0.299999999999999989	Setosa
5	3.39999999999999991	1.5	0.200000000000000011	Setosa
4.40000000000000036	2.89999999999999991	1.39999999999999991	0.200000000000000011	Setosa
4.90000000000000036	3.10000000000000009	1.5	0.100000000000000006	Setosa
5.40000000000000036	3.70000000000000018	1.5	0.200000000000000011	Setosa
4.79999999999999982	3.39999999999999991	1.60000000000000009	0.200000000000000011	Setosa
4.79999999999999982	3	1.39999999999999991	0.100000000000000006	Setosa
4.29999999999999982	3	1.10000000000000009	0.100000000000000006	Setosa
5.79999999999999982	4	1.19999999999999996	0.200000000000000011	Setosa
5.70000000000000018	4.40000000000000036	1.5	0.400000000000000022	Setosa
5.40000000000000036	3.89999999999999991	1.30000000000000004	0.400000000000000022	Setosa
5.09999999999999964	3.5	1.39999999999999991	0.299999999999999989	Setosa
5.70000000000000018	3.79999999999999982	1.69999999999999996	0.299999999999999989	Setosa
5.09999999999999964	3.79999999999999982	1.5	0.299999999999999989	Setosa
5.40000000000000036	3.39999999999999991	1.69999999999999996	0.200000000000000011	Setosa
5.09999999999999964	3.70000000000000018	1.5	0.400000000000000022	Setosa
4.59999999999999964	3.60000000000000009	1	0.200000000000000011	Setosa
5.09999999999999964	3.29999999999999982	1.69999999999999996	0.5	Setosa
4.79999999999999982	3.39999999999999991	1.89999999999999991	0.200000000000000011	Setosa
5	3	1.60000000000000009	0.200000000000000011	Setosa
5	3.39999999999999991	1.60000000000000009	0.400000000000000022	Setosa
5.20000000000000018	3.5	1.5	0.200000000000000011	Setosa
5.20000000000000018	3.39999999999999991	1.39999999999999991	0.200000000000000011	Setosa
4.70000000000000018	3.20000000000000018	1.60000000000000009	0.200000000000000011	Setosa
4.79999999999999982	3.10000000000000009	1.60000000000000009	0.200000000000000011	Setosa
5.40000000000000036	3.39999999999999991	1.5	0.400000000000000022	Setosa
5.20000000000000018	4.09999999999999964	1.5	0.100000000000000006	Setosa
5.5	4.20000000000000018	1.39999999999999991	0.200000000000000011	Setosa
4.90000000000000036	3.10000000000000009	1.5	0.200000000000000011	Setosa
5	3.20000000000000018	1.19999999999999996	0.200000000000000011	Setosa
5.5	3.5	1.30000000000000004	0.200000000000000011	Setosa
4.90000000000000036	3.60000000000000009	1.39999999999999991	0.100000000000000006	Setosa
4.40000000000000036	3	1.30000000000000004	0.200000000000000011	Setosa
5.09999999999999964	3.39999999999999991	1.5	0.200000000000000011	Setosa
5	3.5	1.30000000000000004	0.299999999999999989	Setosa
4.5	2.29999999999999982	1.30000000000000004	0.299999999999999989	Setosa
4.40000000000000036	3.20000000000000018	1.30000000000000004	0.200000000000000011	Setosa
5	3.5	1.60000000000000009	0.599999999999999978	Setosa
5.09999999999999964	3.79999999999999982	1.89999999999999991	0.400000000000000022	Setosa
4.79999999999999982	3	1.39999999999999991	0.299999999999999989	Setosa
5.09999999999999964	3.79999999999999982	1.60000000000000009	0.200000000000000011	Setosa
4.59999999999999964	3.20000000000000018	1.39999999999999991	0.200000000000000011	Setosa
5.29999999999999982	3.70000000000000018	1.5	0.200000000000000011	Setosa
5	3.29999999999999982	1.39999999999999991	0.200000000000000011	Setosa
7	3.20000000000000018	4.70000000000000018	1.39999999999999991	Versicolor
6.40000000000000036	3.20000000000000018	4.5	1.5	Versicolor
6.90000000000000036	3.10000000000000009	4.90000000000000036	1.5	Versicolor
5.5	2.29999999999999982	4	1.30000000000000004	Versicolor
6.5	2.79999999999999982	4.59999999999999964	1.5	Versicolor
5.70000000000000018	2.79999999999999982	4.5	1.30000000000000004	Versicolor
6.29999999999999982	3.29999999999999982	4.70000000000000018	1.60000000000000009	Versicolor
4.90000000000000036	2.39999999999999991	3.29999999999999982	1	Versicolor
6.59999999999999964	2.89999999999999991	4.59999999999999964	1.30000000000000004	Versicolor
5.20000000000000018	2.70000000000000018	3.89999999999999991	1.39999999999999991	Versicolor
5	2	3.5	1	Versicolor
5.90000000000000036	3	4.20000000000000018	1.5	Versicolor
6	2.20000000000000018	4	1	Versicolor
6.09999999999999964	2.89999999999999991	4.70000000000000018	1.39999999999999991	Versicolor
5.59999999999999964	2.89999999999999991	3.60000000000000009	1.30000000000000004	Versicolor
6.70000000000000018	3.10000000000000009	4.40000000000000036	1.39999999999999991	Versicolor
5.59999999999999964	3	4.5	1.5	Versicolor
5.79999999999999982	2.70000000000000018	4.09999999999999964	1	Versicolor
6.20000000000000018	2.20000000000000018	4.5	1.5	Versicolor
5.59999999999999964	2.5	3.89999999999999991	1.10000000000000009	Versicolor
5.90000000000000036	3.20000000000000018	4.79999999999999982	1.80000000000000004	Versicolor
6.09999999999999964	2.79999999999999982	4	1.30000000000000004	Versicolor
6.29999999999999982	2.5	4.90000000000000036	1.5	Versicolor
6.09999999999999964	2.79999999999999982	4.70000000000000018	1.19999999999999996	Versicolor
6.40000000000000036	2.89999999999999991	4.29999999999999982	1.30000000000000004	Versicolor
6.59999999999999964	3	4.40000000000000036	1.39999999999999991	Versicolor
6.79999999999999982	2.79999999999999982	4.79999999999999982	1.39999999999999991	Versicolor
6.70000000000000018	3	5	1.69999999999999996	Versicolor
6	2.89999999999999991	4.5	1.5	Versicolor
5.70000000000000018	2.60000000000000009	3.5	1	Versicolor
5.5	2.39999999999999991	3.79999999999999982	1.10000000000000009	Versicolor
5.5	2.39999999999999991	3.70000000000000018	1	Versicolor
5.79999999999999982	2.70000000000000018	3.89999999999999991	1.19999999999999996	Versicolor
6	2.70000000000000018	5.09999999999999964	1.60000000000000009	Versicolor
5.40000000000000036	3	4.5	1.5	Versicolor
6	3.39999999999999991	4.5	1.60000000000000009	Versicolor
6.70000000000000018	3.10000000000000009	4.70000000000000018	1.5	Versicolor
6.29999999999999982	2.29999999999999982	4.40000000000000036	1.30000000000000004	Versicolor
5.59999999999999964	3	4.09999999999999964	1.30000000000000004	Versicolor
5.5	2.5	4	1.30000000000000004	Versicolor
5.5	2.60000000000000009	4.40000000000000036	1.19999999999999996	Versicolor
6.09999999999999964	3	4.59999999999999964	1.39999999999999991	Versicolor
5.79999999999999982	2.60000000000000009	4	1.19999999999999996	Versicolor
5	2.29999999999999982	3.29999999999999982	1	Versicolor
5.59999999999999964	2.70000000000000018	4.20000000000000018	1.30000000000000004	Versicolor
5.70000000000000018	3	4.20000000000000018	1.19999999999999996	Versicolor
5.70000000000000018	2.89999999999999991	4.20000000000000018	1.30000000000000004	Versicolor
6.20000000000000018	2.89999999999999991	4.29999999999999982	1.30000000000000004	Versicolor
5.09999999999999964	2.5	3	1.10000000000000009	Versicolor
5.70000000000000018	2.79999999999999982	4.09999999999999964	1.30000000000000004	Versicolor
6.29999999999999982	3.29999999999999982	6	2.5	Virginica
5.79999999999999982	2.70000000000000018	5.09999999999999964	1.89999999999999991	Virginica
7.09999999999999964	3	5.90000000000000036	2.10000000000000009	Virginica
6.29999999999999982	2.89999999999999991	5.59999999999999964	1.80000000000000004	Virginica
6.5	3	5.79999999999999982	2.20000000000000018	Virginica
7.59999999999999964	3	6.59999999999999964	2.10000000000000009	Virginica
4.90000000000000036	2.5	4.5	1.69999999999999996	Virginica
7.29999999999999982	2.89999999999999991	6.29999999999999982	1.80000000000000004	Virginica
6.70000000000000018	2.5	5.79999999999999982	1.80000000000000004	Virginica
7.20000000000000018	3.60000000000000009	6.09999999999999964	2.5	Virginica
6.5	3.20000000000000018	5.09999999999999964	2	Virginica
6.40000000000000036	2.70000000000000018	5.29999999999999982	1.89999999999999991	Virginica
6.79999999999999982	3	5.5	2.10000000000000009	Virginica
5.70000000000000018	2.5	5	2	Virginica
5.79999999999999982	2.79999999999999982	5.09999999999999964	2.39999999999999991	Virginica
6.40000000000000036	3.20000000000000018	5.29999999999999982	2.29999999999999982	Virginica
6.5	3	5.5	1.80000000000000004	Virginica
7.70000000000000018	3.79999999999999982	6.70000000000000018	2.20000000000000018	Virginica
7.70000000000000018	2.60000000000000009	6.90000000000000036	2.29999999999999982	Virginica
6	2.20000000000000018	5	1.5	Virginica
6.90000000000000036	3.20000000000000018	5.70000000000000018	2.29999999999999982	Virginica
5.59999999999999964	2.79999999999999982	4.90000000000000036	2	Virginica
7.70000000000000018	2.79999999999999982	6.70000000000000018	2	Virginica
6.29999999999999982	2.70000000000000018	4.90000000000000036	1.80000000000000004	Virginica
6.70000000000000018	3.29999999999999982	5.70000000000000018	2.10000000000000009	Virginica
7.20000000000000018	3.20000000000000018	6	1.80000000000000004	Virginica
6.20000000000000018	2.79999999999999982	4.79999999999999982	1.80000000000000004	Virginica
6.09999999999999964	3	4.90000000000000036	1.80000000000000004	Virginica
6.40000000000000036	2.79999999999999982	5.59999999999999964	2.10000000000000009	Virginica
7.20000000000000018	3	5.79999999999999982	1.60000000000000009	Virginica
7.40000000000000036	2.79999999999999982	6.09999999999999964	1.89999999999999991	Virginica
7.90000000000000036	3.79999999999999982	6.40000000000000036	2	Virginica
6.40000000000000036	2.79999999999999982	5.59999999999999964	2.20000000000000018	Virginica
6.29999999999999982	2.79999999999999982	5.09999999999999964	1.5	Virginica
6.09999999999999964	2.60000000000000009	5.59999999999999964	1.39999999999999991	Virginica
7.70000000000000018	3	6.09999999999999964	2.29999999999999982	Virginica
6.29999999999999982	3.39999999999999991	5.59999999999999964	2.39999999999999991	Virginica
6.40000000000000036	3.10000000000000009	5.5	1.80000000000000004	Virginica
6	3	4.79999999999999982	1.80000000000000004	Virginica
6.90000000000000036	3.10000000000000009	5.40000000000000036	2.10000000000000009	Virginica
6.70000000000000018	3.10000000000000009	5.59999999999999964	2.39999999999999991	Virginica
6.90000000000000036	3.10000000000000009	5.09999999999999964	2.29999999999999982	Virginica
5.79999999999999982	2.70000000000000018	5.09999999999999964	1.89999999999999991	Virginica
6.79999999999999982	3.20000000000000018	5.90000000000000036	2.29999999999999982	Virginica
6.70000000000000018	3.29999999999999982	5.70000000000000018	2.5	Virginica
6.70000000000000018	3	5.20000000000000018	2.29999999999999982	Virginica
6.29999999999999982	2.5	5	1.89999999999999991	Virginica
6.5	3	5.20000000000000018	2	Virginica
6.20000000000000018	3.39999999999999991	5.40000000000000036	2.29999999999999982	Virginica
5.90000000000000036	3	5.09999999999999964	1.80000000000000004	Virginica
\.


--
-- PostgreSQL database dump complete
--

--
-- Database "tellery" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 10.17 (Debian 10.17-1.pgdg90+1)
-- Dumped by pg_dump version 13.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: tellery; Type: DATABASE; Schema: -; Owner: postgres
--

-- CREATE DATABASE tellery IF NOT EXISTS WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_US.utf8';


ALTER DATABASE tellery OWNER TO postgres;

\connect tellery

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: links_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.links_type_enum AS ENUM (
    'block_ref',
    'question_ref'
);


ALTER TYPE public.links_type_enum OWNER TO postgres;

--
-- Name: textsend_i(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.textsend_i(text) RETURNS bytea
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$    
        select textsend(lower($1));    
      $_$;


ALTER FUNCTION public.textsend_i(text) OWNER TO postgres;

SET default_tablespace = '';

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "activityListId" character varying NOT NULL,
    "resourceId" character varying NOT NULL,
    "workspaceId" character varying NOT NULL,
    "resourceType" character varying NOT NULL,
    "operatorId" character varying NOT NULL,
    cmd character varying NOT NULL,
    "timestamp" bigint NOT NULL,
    before json,
    after json
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: activity_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_list (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "workspaceId" character varying NOT NULL,
    "resourceId" character varying NOT NULL,
    "resourceType" character varying NOT NULL,
    "resourceCmd" character varying NOT NULL,
    "startTimestamp" bigint NOT NULL
);


ALTER TABLE public.activity_list OWNER TO postgres;

--
-- Name: blocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocks (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id character varying NOT NULL,
    "interKey" character varying NOT NULL,
    "workspaceId" character varying NOT NULL,
    "storyId" character varying NOT NULL,
    "parentId" character varying NOT NULL,
    "parentTable" character varying NOT NULL,
    type character varying NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    format json,
    permissions jsonb DEFAULT '[{"role": "manager", "type": "workspace"}]'::jsonb NOT NULL,
    children character varying[],
    "searchableText" character varying,
    alive boolean DEFAULT true NOT NULL,
    "createdById" character varying,
    "lastEditedById" character varying
);


ALTER TABLE public.blocks OWNER TO postgres;

--
-- Name: connectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connectors (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "workspaceId" character varying NOT NULL,
    "authType" character varying NOT NULL,
    "authData" json NOT NULL,
    url character varying NOT NULL,
    name character varying NOT NULL,
    alive boolean DEFAULT true NOT NULL
);


ALTER TABLE public.connectors OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id character varying NOT NULL,
    "workspaceId" character varying NOT NULL,
    content bytea NOT NULL,
    "contentType" character varying NOT NULL,
    size integer NOT NULL,
    metadata jsonb NOT NULL
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.links (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "sourceBlockId" character varying NOT NULL,
    "targetBlockId" character varying NOT NULL,
    type public.links_type_enum NOT NULL,
    "sourceAlive" boolean DEFAULT true NOT NULL,
    "targetAlive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.links OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.queue (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id integer NOT NULL,
    key character varying NOT NULL,
    object json NOT NULL,
    deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.queue OWNER TO postgres;

--
-- Name: queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.queue_id_seq OWNER TO postgres;

--
-- Name: queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.queue_id_seq OWNED BY public.queue.id;


--
-- Name: snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.snapshots (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id character varying NOT NULL,
    "questionId" character varying NOT NULL,
    sql character varying NOT NULL,
    data json NOT NULL,
    alive boolean DEFAULT true NOT NULL,
    "createdById" character varying,
    "lastEditedById" character varying
);


ALTER TABLE public.snapshots OWNER TO postgres;

--
-- Name: socket_io_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.socket_io_attachments (
    id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payload bytea NOT NULL
);


ALTER TABLE public.socket_io_attachments OWNER TO postgres;

--
-- Name: story_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.story_histories (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "storyId" character varying NOT NULL,
    "workspaceId" character varying NOT NULL,
    contents jsonb NOT NULL,
    "createdById" character varying NOT NULL
);


ALTER TABLE public.story_histories OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying NOT NULL,
    email character varying NOT NULL,
    avatar character varying,
    password character varying NOT NULL,
    status character varying DEFAULT 'verifying'::character varying NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "resourceId" character varying NOT NULL,
    "userId" character varying NOT NULL,
    "lastVisitTimestamp" bigint NOT NULL
);


ALTER TABLE public.visits OWNER TO postgres;

--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspace_members (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "workspaceId" uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    role character varying NOT NULL,
    status character varying NOT NULL,
    "invitedAt" timestamp without time zone,
    "joinAt" timestamp without time zone,
    "invitedById" character varying
);


ALTER TABLE public.workspace_members OWNER TO postgres;

--
-- Name: workspace_views; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspace_views (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "workspaceId" character varying NOT NULL,
    "userId" character varying NOT NULL,
    "pinnedList" character varying[] DEFAULT '{}'::character varying[] NOT NULL
);


ALTER TABLE public.workspace_views OWNER TO postgres;

--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workspaces (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    version integer NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    avatar character varying,
    "inviteCode" character varying NOT NULL,
    preferences json DEFAULT '{}'::json NOT NULL
);


ALTER TABLE public.workspaces OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue ALTER COLUMN id SET DEFAULT nextval('public.queue_id_seq'::regclass);


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities ("createdAt", "updatedAt", version, id, "activityListId", "resourceId", "workspaceId", "resourceType", "operatorId", cmd, "timestamp", before, after) FROM stdin;
2021-07-07 14:27:19.912759	2021-07-07 14:27:19.912759	1	c164b903-10c4-4603-8924-b32d9f94d117	f9a63257-7bcd-408d-99c2-ed367c4057df	ecWdUHRNPGXqS9f1opXBp	d3990d0a-65e4-42a4-95b4-9724bad9078b	block	2fc20f27-f2f8-45ef-a0ca-c776178bc473	created	1625667621082	\N	{"version":1,"createdAt":"2021-07-07T14:20:21.054Z","updatedAt":"2021-07-07T14:20:21.054Z","createdById":"2fc20f27-f2f8-45ef-a0ca-c776178bc473","lastEditedById":"2fc20f27-f2f8-45ef-a0ca-c776178bc473","alive":true,"id":"ecWdUHRNPGXqS9f1opXBp","parentId":"qg29Ei510eRzLqIydu2jg","parentTable":"block","storyId":"qg29Ei510eRzLqIydu2jg","content":{"title":[]},"format":{},"children":[],"permissions":[{"role":"manager","type":"workspace"}],"workspaceId":"d3990d0a-65e4-42a4-95b4-9724bad9078b"}
\.


--
-- Data for Name: activity_list; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_list ("createdAt", "updatedAt", version, id, "workspaceId", "resourceId", "resourceType", "resourceCmd", "startTimestamp") FROM stdin;
2021-07-07 14:27:19.887131	2021-07-07 14:27:19.887131	1	91b8b29b-3425-4457-a682-3be4f95a2821	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	story	created	1625667615814
2021-07-07 14:27:19.897905	2021-07-07 14:27:19.897905	1	f9a63257-7bcd-408d-99c2-ed367c4057df	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	story	updated	1625667619073
\.


--
-- Data for Name: blocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.blocks ("createdAt", "updatedAt", version, id, "interKey", "workspaceId", "storyId", "parentId", "parentTable", type, content, format, permissions, children, "searchableText", alive, "createdById", "lastEditedById") FROM stdin;
2021-07-07 14:20:15.796203	2021-07-07 14:42:40.943859	55	qg29Ei510eRzLqIydu2jg	bd58329d660c12483492699623875365	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	d3990d0a-65e4-42a4-95b4-9724bad9078b	workspace	story	{"title": [["Welcome to Tellery"]]}	{}	[{"role": "manager", "type": "workspace"}]	{ecWdUHRNPGXqS9f1opXBp}	Welcome to Tellery	t	2fc20f27-f2f8-45ef-a0ca-c776178bc473	2fc20f27-f2f8-45ef-a0ca-c776178bc473
2021-07-07 14:28:29.933374	2021-07-07 14:36:02.076914	2	YHVb-VsC3Y33oe4VuOiVf	YHVb-VsC3Y33oe4VuOiVf	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	qg29Ei510eRzLqIydu2jg	block	file	{"title": []}	{}	[{"role": "manager", "type": "workspace"}]	{}	\N	f	2fc20f27-f2f8-45ef-a0ca-c776178bc473	2fc20f27-f2f8-45ef-a0ca-c776178bc473
2021-07-07 14:35:55.112089	2021-07-07 14:36:04.190875	2	pDZbMBmlfj_dU5MRcpvGx	pDZbMBmlfj_dU5MRcpvGx	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	qg29Ei510eRzLqIydu2jg	block	text	{"title": []}	{}	[{"role": "manager", "type": "workspace"}]	{}		f	2fc20f27-f2f8-45ef-a0ca-c776178bc473	2fc20f27-f2f8-45ef-a0ca-c776178bc473
2021-07-07 14:35:48.620275	2021-07-07 14:36:04.640587	2	T1sx6YFJtO4ZpFnUVJB41	T1sx6YFJtO4ZpFnUVJB41	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	qg29Ei510eRzLqIydu2jg	block	text	{"title": []}	{}	[{"role": "manager", "type": "workspace"}]	{}		f	2fc20f27-f2f8-45ef-a0ca-c776178bc473	2fc20f27-f2f8-45ef-a0ca-c776178bc473
2021-07-07 14:20:21.054882	2021-07-07 14:41:53.385742	30	ecWdUHRNPGXqS9f1opXBp	ecWdUHRNPGXqS9f1opXBp	d3990d0a-65e4-42a4-95b4-9724bad9078b	qg29Ei510eRzLqIydu2jg	qg29Ei510eRzLqIydu2jg	block	question	{"sql": "select * from iris_data", "title": [["Iris sample data"]], "snapshotId": "EFzzzaI0l6meJL6jxu6RS", "visualization": {"keys": ["sepal_length", "sepal_width", "petal_length", "petal_width", "variety"], "type": "Pie", "slices": [{"key": "Virginica", "color": 0, "title": "Virginica"}, {"key": "Versicolor", "color": 1, "title": "Versicolor"}, {"key": "Setosa", "color": 2, "title": "Setosa"}], "dimension": "variety", "showTotal": true, "showLegend": true, "measurement": "sepal_length", "minPercentage": 1}}	{"width":0.7,"aspectRatio":1.7777777777777777}	[{"role": "manager", "type": "workspace"}]	{}	Iris sample data	t	2fc20f27-f2f8-45ef-a0ca-c776178bc473	2fc20f27-f2f8-45ef-a0ca-c776178bc473
\.


--
-- Data for Name: connectors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.connectors ("createdAt", "updatedAt", version, id, "workspaceId", "authType", "authData", url, name, alive) FROM stdin;
2021-07-07 14:19:16.738007	2021-07-07 14:19:16.738007	1	830781ac-7473-4dea-8060-a08bad9ad86c	d3990d0a-65e4-42a4-95b4-9724bad9078b	none	{}	tellery-connector:50051	default	t
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files ("createdAt", "updatedAt", version, id, "workspaceId", content, "contentType", size, metadata) FROM stdin;
2021-07-07 14:28:29.978754	2021-07-07 14:28:29.978754	1	FEP8J7rBaW1D-LA06dP2N	d3990d0a-65e4-42a4-95b4-9724bad9078b	\\x736570616c2e6c656e6774682c736570616c2e77696474682c706574616c2e6c656e6774682c706574616c2e77696474682c766172696574790d0a352e312c332e352c312e342c302e322c5365746f73610d0a342e392c332c312e342c302e322c5365746f73610d0a342e372c332e322c312e332c302e322c5365746f73610d0a342e362c332e312c312e352c302e322c5365746f73610d0a352c332e362c312e342c302e322c5365746f73610d0a352e342c332e392c312e372c302e342c5365746f73610d0a342e362c332e342c312e342c302e332c5365746f73610d0a352c332e342c312e352c302e322c5365746f73610d0a342e342c322e392c312e342c302e322c5365746f73610d0a342e392c332e312c312e352c302e312c5365746f73610d0a352e342c332e372c312e352c302e322c5365746f73610d0a342e382c332e342c312e362c302e322c5365746f73610d0a342e382c332c312e342c302e312c5365746f73610d0a342e332c332c312e312c302e312c5365746f73610d0a352e382c342c312e322c302e322c5365746f73610d0a352e372c342e342c312e352c302e342c5365746f73610d0a352e342c332e392c312e332c302e342c5365746f73610d0a352e312c332e352c312e342c302e332c5365746f73610d0a352e372c332e382c312e372c302e332c5365746f73610d0a352e312c332e382c312e352c302e332c5365746f73610d0a352e342c332e342c312e372c302e322c5365746f73610d0a352e312c332e372c312e352c302e342c5365746f73610d0a342e362c332e362c312c302e322c5365746f73610d0a352e312c332e332c312e372c302e352c5365746f73610d0a342e382c332e342c312e392c302e322c5365746f73610d0a352c332c312e362c302e322c5365746f73610d0a352c332e342c312e362c302e342c5365746f73610d0a352e322c332e352c312e352c302e322c5365746f73610d0a352e322c332e342c312e342c302e322c5365746f73610d0a342e372c332e322c312e362c302e322c5365746f73610d0a342e382c332e312c312e362c302e322c5365746f73610d0a352e342c332e342c312e352c302e342c5365746f73610d0a352e322c342e312c312e352c302e312c5365746f73610d0a352e352c342e322c312e342c302e322c5365746f73610d0a342e392c332e312c312e352c302e322c5365746f73610d0a352c332e322c312e322c302e322c5365746f73610d0a352e352c332e352c312e332c302e322c5365746f73610d0a342e392c332e362c312e342c302e312c5365746f73610d0a342e342c332c312e332c302e322c5365746f73610d0a352e312c332e342c312e352c302e322c5365746f73610d0a352c332e352c312e332c302e332c5365746f73610d0a342e352c322e332c312e332c302e332c5365746f73610d0a342e342c332e322c312e332c302e322c5365746f73610d0a352c332e352c312e362c302e362c5365746f73610d0a352e312c332e382c312e392c302e342c5365746f73610d0a342e382c332c312e342c302e332c5365746f73610d0a352e312c332e382c312e362c302e322c5365746f73610d0a342e362c332e322c312e342c302e322c5365746f73610d0a352e332c332e372c312e352c302e322c5365746f73610d0a352c332e332c312e342c302e322c5365746f73610d0a372c332e322c342e372c312e342c5665727369636f6c6f720d0a362e342c332e322c342e352c312e352c5665727369636f6c6f720d0a362e392c332e312c342e392c312e352c5665727369636f6c6f720d0a352e352c322e332c342c312e332c5665727369636f6c6f720d0a362e352c322e382c342e362c312e352c5665727369636f6c6f720d0a352e372c322e382c342e352c312e332c5665727369636f6c6f720d0a362e332c332e332c342e372c312e362c5665727369636f6c6f720d0a342e392c322e342c332e332c312c5665727369636f6c6f720d0a362e362c322e392c342e362c312e332c5665727369636f6c6f720d0a352e322c322e372c332e392c312e342c5665727369636f6c6f720d0a352c322c332e352c312c5665727369636f6c6f720d0a352e392c332c342e322c312e352c5665727369636f6c6f720d0a362c322e322c342c312c5665727369636f6c6f720d0a362e312c322e392c342e372c312e342c5665727369636f6c6f720d0a352e362c322e392c332e362c312e332c5665727369636f6c6f720d0a362e372c332e312c342e342c312e342c5665727369636f6c6f720d0a352e362c332c342e352c312e352c5665727369636f6c6f720d0a352e382c322e372c342e312c312c5665727369636f6c6f720d0a362e322c322e322c342e352c312e352c5665727369636f6c6f720d0a352e362c322e352c332e392c312e312c5665727369636f6c6f720d0a352e392c332e322c342e382c312e382c5665727369636f6c6f720d0a362e312c322e382c342c312e332c5665727369636f6c6f720d0a362e332c322e352c342e392c312e352c5665727369636f6c6f720d0a362e312c322e382c342e372c312e322c5665727369636f6c6f720d0a362e342c322e392c342e332c312e332c5665727369636f6c6f720d0a362e362c332c342e342c312e342c5665727369636f6c6f720d0a362e382c322e382c342e382c312e342c5665727369636f6c6f720d0a362e372c332c352c312e372c5665727369636f6c6f720d0a362c322e392c342e352c312e352c5665727369636f6c6f720d0a352e372c322e362c332e352c312c5665727369636f6c6f720d0a352e352c322e342c332e382c312e312c5665727369636f6c6f720d0a352e352c322e342c332e372c312c5665727369636f6c6f720d0a352e382c322e372c332e392c312e322c5665727369636f6c6f720d0a362c322e372c352e312c312e362c5665727369636f6c6f720d0a352e342c332c342e352c312e352c5665727369636f6c6f720d0a362c332e342c342e352c312e362c5665727369636f6c6f720d0a362e372c332e312c342e372c312e352c5665727369636f6c6f720d0a362e332c322e332c342e342c312e332c5665727369636f6c6f720d0a352e362c332c342e312c312e332c5665727369636f6c6f720d0a352e352c322e352c342c312e332c5665727369636f6c6f720d0a352e352c322e362c342e342c312e322c5665727369636f6c6f720d0a362e312c332c342e362c312e342c5665727369636f6c6f720d0a352e382c322e362c342c312e322c5665727369636f6c6f720d0a352c322e332c332e332c312c5665727369636f6c6f720d0a352e362c322e372c342e322c312e332c5665727369636f6c6f720d0a352e372c332c342e322c312e322c5665727369636f6c6f720d0a352e372c322e392c342e322c312e332c5665727369636f6c6f720d0a362e322c322e392c342e332c312e332c5665727369636f6c6f720d0a352e312c322e352c332c312e312c5665727369636f6c6f720d0a352e372c322e382c342e312c312e332c5665727369636f6c6f720d0a362e332c332e332c362c322e352c56697267696e6963610d0a352e382c322e372c352e312c312e392c56697267696e6963610d0a372e312c332c352e392c322e312c56697267696e6963610d0a362e332c322e392c352e362c312e382c56697267696e6963610d0a362e352c332c352e382c322e322c56697267696e6963610d0a372e362c332c362e362c322e312c56697267696e6963610d0a342e392c322e352c342e352c312e372c56697267696e6963610d0a372e332c322e392c362e332c312e382c56697267696e6963610d0a362e372c322e352c352e382c312e382c56697267696e6963610d0a372e322c332e362c362e312c322e352c56697267696e6963610d0a362e352c332e322c352e312c322c56697267696e6963610d0a362e342c322e372c352e332c312e392c56697267696e6963610d0a362e382c332c352e352c322e312c56697267696e6963610d0a352e372c322e352c352c322c56697267696e6963610d0a352e382c322e382c352e312c322e342c56697267696e6963610d0a362e342c332e322c352e332c322e332c56697267696e6963610d0a362e352c332c352e352c312e382c56697267696e6963610d0a372e372c332e382c362e372c322e322c56697267696e6963610d0a372e372c322e362c362e392c322e332c56697267696e6963610d0a362c322e322c352c312e352c56697267696e6963610d0a362e392c332e322c352e372c322e332c56697267696e6963610d0a352e362c322e382c342e392c322c56697267696e6963610d0a372e372c322e382c362e372c322c56697267696e6963610d0a362e332c322e372c342e392c312e382c56697267696e6963610d0a362e372c332e332c352e372c322e312c56697267696e6963610d0a372e322c332e322c362c312e382c56697267696e6963610d0a362e322c322e382c342e382c312e382c56697267696e6963610d0a362e312c332c342e392c312e382c56697267696e6963610d0a362e342c322e382c352e362c322e312c56697267696e6963610d0a372e322c332c352e382c312e362c56697267696e6963610d0a372e342c322e382c362e312c312e392c56697267696e6963610d0a372e392c332e382c362e342c322c56697267696e6963610d0a362e342c322e382c352e362c322e322c56697267696e6963610d0a362e332c322e382c352e312c312e352c56697267696e6963610d0a362e312c322e362c352e362c312e342c56697267696e6963610d0a372e372c332c362e312c322e332c56697267696e6963610d0a362e332c332e342c352e362c322e342c56697267696e6963610d0a362e342c332e312c352e352c312e382c56697267696e6963610d0a362c332c342e382c312e382c56697267696e6963610d0a362e392c332e312c352e342c322e312c56697267696e6963610d0a362e372c332e312c352e362c322e342c56697267696e6963610d0a362e392c332e312c352e312c322e332c56697267696e6963610d0a352e382c322e372c352e312c312e392c56697267696e6963610d0a362e382c332e322c352e392c322e332c56697267696e6963610d0a362e372c332e332c352e372c322e352c56697267696e6963610d0a362e372c332c352e322c322e332c56697267696e6963610d0a362e332c322e352c352c312e392c56697267696e6963610d0a362e352c332c352e322c322c56697267696e6963610d0a362e322c332e342c352e342c322e332c56697267696e6963610d0a352e392c332c352e312c312e382c56697267696e696361	text/csv	3865	{"name": "data (3).csv"}
\.


--
-- Data for Name: links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.links ("createdAt", "updatedAt", version, id, "sourceBlockId", "targetBlockId", type, "sourceAlive", "targetAlive") FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1623219476808	TextSearchIndexing1623219476808
\.


--
-- Data for Name: queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.queue ("createdAt", "updatedAt", version, id, key, object, deleted) FROM stdin;
\.


--
-- Data for Name: snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.snapshots ("createdAt", "updatedAt", version, id, "questionId", sql, data, alive, "createdById", "lastEditedById") FROM stdin;
2021-07-07 14:37:22.78806	2021-07-07 14:37:22.78806	1	Q5leh-D65eM1ELqHMECNx	ecWdUHRNPGXqS9f1opXBp	select * from iris_data	{"records":[],"fields":[{"name":"sepal_length","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"sepal_width","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"petal_length","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"petal_width","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"variety","displayType":"STRING","sqlType":"VARCHAR"}],"truncated":false}	t	\N	\N
2021-07-07 14:41:26.938056	2021-07-07 14:41:26.938056	1	EFzzzaI0l6meJL6jxu6RS	ecWdUHRNPGXqS9f1opXBp	select * from iris_data	{"records":[[5.1,3.5,1.4,0.2,"Setosa"],[4.9,3,1.4,0.2,"Setosa"],[4.7,3.2,1.3,0.2,"Setosa"],[4.6,3.1,1.5,0.2,"Setosa"],[5,3.6,1.4,0.2,"Setosa"],[5.4,3.9,1.7,0.4,"Setosa"],[4.6,3.4,1.4,0.3,"Setosa"],[5,3.4,1.5,0.2,"Setosa"],[4.4,2.9,1.4,0.2,"Setosa"],[4.9,3.1,1.5,0.1,"Setosa"],[5.4,3.7,1.5,0.2,"Setosa"],[4.8,3.4,1.6,0.2,"Setosa"],[4.8,3,1.4,0.1,"Setosa"],[4.3,3,1.1,0.1,"Setosa"],[5.8,4,1.2,0.2,"Setosa"],[5.7,4.4,1.5,0.4,"Setosa"],[5.4,3.9,1.3,0.4,"Setosa"],[5.1,3.5,1.4,0.3,"Setosa"],[5.7,3.8,1.7,0.3,"Setosa"],[5.1,3.8,1.5,0.3,"Setosa"],[5.4,3.4,1.7,0.2,"Setosa"],[5.1,3.7,1.5,0.4,"Setosa"],[4.6,3.6,1,0.2,"Setosa"],[5.1,3.3,1.7,0.5,"Setosa"],[4.8,3.4,1.9,0.2,"Setosa"],[5,3,1.6,0.2,"Setosa"],[5,3.4,1.6,0.4,"Setosa"],[5.2,3.5,1.5,0.2,"Setosa"],[5.2,3.4,1.4,0.2,"Setosa"],[4.7,3.2,1.6,0.2,"Setosa"],[4.8,3.1,1.6,0.2,"Setosa"],[5.4,3.4,1.5,0.4,"Setosa"],[5.2,4.1,1.5,0.1,"Setosa"],[5.5,4.2,1.4,0.2,"Setosa"],[4.9,3.1,1.5,0.2,"Setosa"],[5,3.2,1.2,0.2,"Setosa"],[5.5,3.5,1.3,0.2,"Setosa"],[4.9,3.6,1.4,0.1,"Setosa"],[4.4,3,1.3,0.2,"Setosa"],[5.1,3.4,1.5,0.2,"Setosa"],[5,3.5,1.3,0.3,"Setosa"],[4.5,2.3,1.3,0.3,"Setosa"],[4.4,3.2,1.3,0.2,"Setosa"],[5,3.5,1.6,0.6,"Setosa"],[5.1,3.8,1.9,0.4,"Setosa"],[4.8,3,1.4,0.3,"Setosa"],[5.1,3.8,1.6,0.2,"Setosa"],[4.6,3.2,1.4,0.2,"Setosa"],[5.3,3.7,1.5,0.2,"Setosa"],[5,3.3,1.4,0.2,"Setosa"],[7,3.2,4.7,1.4,"Versicolor"],[6.4,3.2,4.5,1.5,"Versicolor"],[6.9,3.1,4.9,1.5,"Versicolor"],[5.5,2.3,4,1.3,"Versicolor"],[6.5,2.8,4.6,1.5,"Versicolor"],[5.7,2.8,4.5,1.3,"Versicolor"],[6.3,3.3,4.7,1.6,"Versicolor"],[4.9,2.4,3.3,1,"Versicolor"],[6.6,2.9,4.6,1.3,"Versicolor"],[5.2,2.7,3.9,1.4,"Versicolor"],[5,2,3.5,1,"Versicolor"],[5.9,3,4.2,1.5,"Versicolor"],[6,2.2,4,1,"Versicolor"],[6.1,2.9,4.7,1.4,"Versicolor"],[5.6,2.9,3.6,1.3,"Versicolor"],[6.7,3.1,4.4,1.4,"Versicolor"],[5.6,3,4.5,1.5,"Versicolor"],[5.8,2.7,4.1,1,"Versicolor"],[6.2,2.2,4.5,1.5,"Versicolor"],[5.6,2.5,3.9,1.1,"Versicolor"],[5.9,3.2,4.8,1.8,"Versicolor"],[6.1,2.8,4,1.3,"Versicolor"],[6.3,2.5,4.9,1.5,"Versicolor"],[6.1,2.8,4.7,1.2,"Versicolor"],[6.4,2.9,4.3,1.3,"Versicolor"],[6.6,3,4.4,1.4,"Versicolor"],[6.8,2.8,4.8,1.4,"Versicolor"],[6.7,3,5,1.7,"Versicolor"],[6,2.9,4.5,1.5,"Versicolor"],[5.7,2.6,3.5,1,"Versicolor"],[5.5,2.4,3.8,1.1,"Versicolor"],[5.5,2.4,3.7,1,"Versicolor"],[5.8,2.7,3.9,1.2,"Versicolor"],[6,2.7,5.1,1.6,"Versicolor"],[5.4,3,4.5,1.5,"Versicolor"],[6,3.4,4.5,1.6,"Versicolor"],[6.7,3.1,4.7,1.5,"Versicolor"],[6.3,2.3,4.4,1.3,"Versicolor"],[5.6,3,4.1,1.3,"Versicolor"],[5.5,2.5,4,1.3,"Versicolor"],[5.5,2.6,4.4,1.2,"Versicolor"],[6.1,3,4.6,1.4,"Versicolor"],[5.8,2.6,4,1.2,"Versicolor"],[5,2.3,3.3,1,"Versicolor"],[5.6,2.7,4.2,1.3,"Versicolor"],[5.7,3,4.2,1.2,"Versicolor"],[5.7,2.9,4.2,1.3,"Versicolor"],[6.2,2.9,4.3,1.3,"Versicolor"],[5.1,2.5,3,1.1,"Versicolor"],[5.7,2.8,4.1,1.3,"Versicolor"],[6.3,3.3,6,2.5,"Virginica"],[5.8,2.7,5.1,1.9,"Virginica"],[7.1,3,5.9,2.1,"Virginica"],[6.3,2.9,5.6,1.8,"Virginica"],[6.5,3,5.8,2.2,"Virginica"],[7.6,3,6.6,2.1,"Virginica"],[4.9,2.5,4.5,1.7,"Virginica"],[7.3,2.9,6.3,1.8,"Virginica"],[6.7,2.5,5.8,1.8,"Virginica"],[7.2,3.6,6.1,2.5,"Virginica"],[6.5,3.2,5.1,2,"Virginica"],[6.4,2.7,5.3,1.9,"Virginica"],[6.8,3,5.5,2.1,"Virginica"],[5.7,2.5,5,2,"Virginica"],[5.8,2.8,5.1,2.4,"Virginica"],[6.4,3.2,5.3,2.3,"Virginica"],[6.5,3,5.5,1.8,"Virginica"],[7.7,3.8,6.7,2.2,"Virginica"],[7.7,2.6,6.9,2.3,"Virginica"],[6,2.2,5,1.5,"Virginica"],[6.9,3.2,5.7,2.3,"Virginica"],[5.6,2.8,4.9,2,"Virginica"],[7.7,2.8,6.7,2,"Virginica"],[6.3,2.7,4.9,1.8,"Virginica"],[6.7,3.3,5.7,2.1,"Virginica"],[7.2,3.2,6,1.8,"Virginica"],[6.2,2.8,4.8,1.8,"Virginica"],[6.1,3,4.9,1.8,"Virginica"],[6.4,2.8,5.6,2.1,"Virginica"],[7.2,3,5.8,1.6,"Virginica"],[7.4,2.8,6.1,1.9,"Virginica"],[7.9,3.8,6.4,2,"Virginica"],[6.4,2.8,5.6,2.2,"Virginica"],[6.3,2.8,5.1,1.5,"Virginica"],[6.1,2.6,5.6,1.4,"Virginica"],[7.7,3,6.1,2.3,"Virginica"],[6.3,3.4,5.6,2.4,"Virginica"],[6.4,3.1,5.5,1.8,"Virginica"],[6,3,4.8,1.8,"Virginica"],[6.9,3.1,5.4,2.1,"Virginica"],[6.7,3.1,5.6,2.4,"Virginica"],[6.9,3.1,5.1,2.3,"Virginica"],[5.8,2.7,5.1,1.9,"Virginica"],[6.8,3.2,5.9,2.3,"Virginica"],[6.7,3.3,5.7,2.5,"Virginica"],[6.7,3,5.2,2.3,"Virginica"],[6.3,2.5,5,1.9,"Virginica"],[6.5,3,5.2,2,"Virginica"],[6.2,3.4,5.4,2.3,"Virginica"],[5.9,3,5.1,1.8,"Virginica"]],"fields":[{"name":"sepal_length","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"sepal_width","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"petal_length","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"petal_width","displayType":"FLOAT","sqlType":"DOUBLE"},{"name":"variety","displayType":"STRING","sqlType":"VARCHAR"}],"truncated":false}	t	\N	\N
\.


--
-- Data for Name: socket_io_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.socket_io_attachments (id, created_at, payload) FROM stdin;
\.


--
-- Data for Name: story_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.story_histories ("createdAt", "updatedAt", version, id, "storyId", "workspaceId", contents, "createdById") FROM stdin;
2021-07-07 14:41:51.890595	2021-07-07 14:41:51.890595	1	b04c3b30-0895-43dc-9de3-a5363af14a6f	qg29Ei510eRzLqIydu2jg	d3990d0a-65e4-42a4-95b4-9724bad9078b	{"links": [], "blocks": [{"id": "ecWdUHRNPGXqS9f1opXBp", "type": "question", "alive": true, "format": {"width": 0.7, "aspectRatio": 1.7777777777777777}, "content": {"sql": "select * from iris_data", "title": [["IrisSample data"]], "snapshotId": "EFzzzaI0l6meJL6jxu6RS", "visualization": {"keys": ["sepal_length", "sepal_width", "petal_length", "petal_width", "variety"], "type": "Pie", "slices": [{"key": "Virginica", "color": 0, "title": "Virginica"}, {"key": "Versicolor", "color": 1, "title": "Versicolor"}, {"key": "Setosa", "color": 2, "title": "Setosa"}], "dimension": "variety", "showTotal": true, "showLegend": true, "measurement": "sepal_length", "minPercentage": 1}}, "storyId": "qg29Ei510eRzLqIydu2jg", "version": 27, "children": [], "interKey": "ecWdUHRNPGXqS9f1opXBp", "parentId": "qg29Ei510eRzLqIydu2jg", "createdAt": "2021-07-07T14:20:21.054Z", "updatedAt": "2021-07-07T14:41:51.389Z", "createdById": "2fc20f27-f2f8-45ef-a0ca-c776178bc473", "parentTable": "block", "permissions": [{"role": "manager", "type": "workspace"}], "workspaceId": "d3990d0a-65e4-42a4-95b4-9724bad9078b", "lastEditedById": "2fc20f27-f2f8-45ef-a0ca-c776178bc473", "searchableText": "IrisSample data"}, {"id": "qg29Ei510eRzLqIydu2jg", "type": "story", "alive": true, "format": {}, "content": {"title": [["Welcome Tellery"]]}, "storyId": "qg29Ei510eRzLqIydu2jg", "version": 49, "children": ["ecWdUHRNPGXqS9f1opXBp"], "interKey": "e2b6d4ccd8bdfc793874293b4d78a9e2", "parentId": "d3990d0a-65e4-42a4-95b4-9724bad9078b", "createdAt": "2021-07-07T14:20:15.796Z", "updatedAt": "2021-07-07T14:41:51.389Z", "createdById": "2fc20f27-f2f8-45ef-a0ca-c776178bc473", "parentTable": "workspace", "permissions": [{"role": "manager", "type": "workspace"}], "workspaceId": "d3990d0a-65e4-42a4-95b4-9724bad9078b", "lastEditedById": "2fc20f27-f2f8-45ef-a0ca-c776178bc473", "searchableText": "Welcome Tellery"}]}	2fc20f27-f2f8-45ef-a0ca-c776178bc473
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users ("createdAt", "updatedAt", version, id, username, email, avatar, password, status) FROM stdin;
2021-07-07 14:19:15.615226	2021-07-07 14:19:15.615226	2	2fc20f27-f2f8-45ef-a0ca-c776178bc473	admin	admin@tellery.local	http://localhost:8000/api/static/avatars/user-2.png	ee30dd9d11b03cc742c14b5092e285fc	active
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visits ("createdAt", "updatedAt", version, id, "resourceId", "userId", "lastVisitTimestamp") FROM stdin;
2021-07-07 14:20:15.936071	2021-07-07 14:27:33.477296	3	6f90784e-4a8d-4fe8-917b-47b4801dbf0c	qg29Ei510eRzLqIydu2jg	2fc20f27-f2f8-45ef-a0ca-c776178bc473	1625668053439
\.


--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workspace_members ("createdAt", "updatedAt", version, id, "workspaceId", "userId", role, status, "invitedAt", "joinAt", "invitedById") FROM stdin;
2021-07-07 14:19:16.720616	2021-07-07 14:19:16.720616	1	fdc8939c-f416-4a37-8c74-0a2e621daf85	d3990d0a-65e4-42a4-95b4-9724bad9078b	2fc20f27-f2f8-45ef-a0ca-c776178bc473	admin	active	\N	2021-07-07 14:19:16.728	\N
\.


--
-- Data for Name: workspace_views; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workspace_views ("createdAt", "updatedAt", version, id, "workspaceId", "userId", "pinnedList") FROM stdin;
2021-07-07 14:19:21.184461	2021-07-07 14:35:51.070058	2	dacfed05-717b-4c8b-b5a5-5436e9e6d084	d3990d0a-65e4-42a4-95b4-9724bad9078b	2fc20f27-f2f8-45ef-a0ca-c776178bc473	{qg29Ei510eRzLqIydu2jg}
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workspaces ("createdAt", "updatedAt", version, id, name, avatar, "inviteCode", preferences) FROM stdin;
2021-07-07 14:19:16.720616	2021-07-07 14:19:16.720616	1	d3990d0a-65e4-42a4-95b4-9724bad9078b	Default	http://localhost:8000/api/static/avatars/workspace-default.png	4d5470575a6f5579753273776a625f57716d335947	{"connectorId": "830781ac-7473-4dea-8060-a08bad9ad86c", "profile": "default", "dbImportsTo": "sample"}
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);


--
-- Name: queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.queue_id_seq', 1, false);


--
-- Name: workspaces PK_098656ae401f3e1a4586f47fd8e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT "PK_098656ae401f3e1a4586f47fd8e" PRIMARY KEY (id);


--
-- Name: workspace_views PK_0af4bbb3e5312b2ec4e3f23c51a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_views
    ADD CONSTRAINT "PK_0af4bbb3e5312b2ec4e3f23c51a" PRIMARY KEY (id);


--
-- Name: visits PK_0b0b322289a41015c6ea4e8bf30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT "PK_0b0b322289a41015c6ea4e8bf30" PRIMARY KEY (id);


--
-- Name: workspace_members PK_22ab43ac5865cd62769121d2bc4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT "PK_22ab43ac5865cd62769121d2bc4" PRIMARY KEY (id);


--
-- Name: story_histories PK_4a9b7d43767959f8c42d607099d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.story_histories
    ADD CONSTRAINT "PK_4a9b7d43767959f8c42d607099d" PRIMARY KEY (id);


--
-- Name: queue PK_4adefbd9c73b3f9a49985a5529f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT "PK_4adefbd9c73b3f9a49985a5529f" PRIMARY KEY (id);


--
-- Name: files PK_6c16b9093a142e0e7613b04a3d9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY (id);


--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


--
-- Name: blocks PK_8244fa1495c4e9222a01059244b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocks
    ADD CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: connectors PK_c1334e2a68a8de86d1732a8e3fb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connectors
    ADD CONSTRAINT "PK_c1334e2a68a8de86d1732a8e3fb" PRIMARY KEY (id);


--
-- Name: socket_io_attachments PK_dc5b76127041ee7cfa4d5f416d1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.socket_io_attachments
    ADD CONSTRAINT "PK_dc5b76127041ee7cfa4d5f416d1" PRIMARY KEY (id);


--
-- Name: activity_list PK_ec32b64c8bd760b36f0d6c83bb1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_list
    ADD CONSTRAINT "PK_ec32b64c8bd760b36f0d6c83bb1" PRIMARY KEY (id);


--
-- Name: links PK_ecf17f4a741d3c5ba0b4c5ab4b6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT "PK_ecf17f4a741d3c5ba0b4c5ab4b6" PRIMARY KEY (id);


--
-- Name: snapshots PK_f5661b5fd4224d23e26a631986b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT "PK_f5661b5fd4224d23e26a631986b" PRIMARY KEY (id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: IDX_0dcd39b184839a0bf0c9c59b2d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0dcd39b184839a0bf0c9c59b2d" ON public.activity_list USING btree ("workspaceId", "resourceId", "resourceType", "startTimestamp");


--
-- Name: IDX_0f0002ef8e511b367fcae9d092; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0f0002ef8e511b367fcae9d092" ON public.blocks USING btree ("storyId", alive);


--
-- Name: IDX_1a06fd39f4cd4eb58af847a0b0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1a06fd39f4cd4eb58af847a0b0" ON public.blocks USING btree ("workspaceId");


--
-- Name: IDX_22176b38813258c2aadaae3244; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_22176b38813258c2aadaae3244" ON public.workspace_members USING btree ("userId");


--
-- Name: IDX_544f13a0ea1ec065db55f89df1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_544f13a0ea1ec065db55f89df1" ON public.activities USING btree ("activityListId", "resourceId");


--
-- Name: IDX_5b6d7a04c6f684c25394e027d1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5b6d7a04c6f684c25394e027d1" ON public.visits USING btree ("resourceId", "lastVisitTimestamp");


--
-- Name: IDX_5c47be04ba7820322f5ccc26d7; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5c47be04ba7820322f5ccc26d7" ON public.activity_list USING btree ("workspaceId", "startTimestamp");


--
-- Name: IDX_671ee3de623328aa59ed6ccc3b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_671ee3de623328aa59ed6ccc3b" ON public.queue USING btree (key, deleted);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_99bcb5fdac446371d41f048b24; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_99bcb5fdac446371d41f048b24" ON public.workspace_members USING btree ("workspaceId", "userId");


--
-- Name: IDX_a2c9d7a0bc273471872ecdbcfd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_a2c9d7a0bc273471872ecdbcfd" ON public.workspaces USING btree ("inviteCode");


--
-- Name: IDX_b30aea721f8bce989c523a9255; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_b30aea721f8bce989c523a9255" ON public.visits USING btree ("userId", "resourceId");


--
-- Name: IDX_b34c1aebd23f86646ea97e8d19; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_b34c1aebd23f86646ea97e8d19" ON public.workspace_views USING btree ("workspaceId", "userId");


--
-- Name: IDX_bb04c0993c685f0d4d2063d670; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_bb04c0993c685f0d4d2063d670" ON public.blocks USING btree ("interKey") WHERE ((type)::text = 'thought'::text);


--
-- Name: IDX_be5d5e6013642e32304c1ffc10; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_be5d5e6013642e32304c1ffc10" ON public.snapshots USING btree ("questionId");


--
-- Name: IDX_c3a1ea20ac802f44174df88f96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_c3a1ea20ac802f44174df88f96" ON public.links USING btree ("sourceBlockId", "targetBlockId");


--
-- Name: IDX_da0cb9938719b7786608da33d9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_da0cb9938719b7786608da33d9" ON public.blocks USING btree (type, alive);


--
-- Name: IDX_dc5b76127041ee7cfa4d5f416d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_dc5b76127041ee7cfa4d5f416d" ON public.socket_io_attachments USING btree (id);


--
-- Name: searchable_text_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX searchable_text_trgm_idx ON public.blocks USING gin (((public.textsend_i(("searchableText")::text))::text) public.gin_trgm_ops);


--
-- Name: searchable_text_trgm_idx_sql; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX searchable_text_trgm_idx_sql ON public.blocks USING gin (((public.textsend_i((content ->> 'sql'::text)))::text) public.gin_trgm_ops);


--
-- Name: simple_block_searchable_text_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX simple_block_searchable_text_idx ON public.blocks USING gin (to_tsvector('simple'::regconfig, ("searchableText")::text));


--
-- Name: simple_block_searchable_text_idx_sql; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX simple_block_searchable_text_idx_sql ON public.blocks USING gin (to_tsvector('simple'::regconfig, (content ->> 'sql'::text))) WHERE ((type)::text = 'question'::text);


--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database cluster dump complete
--
